const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const express = require('express');
const router = express.Router();

const authenticateToken = require('../middlewares/authenticateToken');

// All routes require authentication
router.use(authenticateToken);

// Helper function to check group membership
async function checkGroupMembership(groupId, userId) {
    const membership = await prisma.groupMember.findUnique({
        where: {
            groupId_userId: { groupId, userId }
        }
    });
    return membership;
}

// Helper function to calculate shares from items
function calculateSharesFromItems(items) {
    const shareMap = {};
    
    items.forEach(item => {
        const itemPrice = parseFloat(item.price) * (item.quantity || 1);
        const allocatedTo = item.allocatedTo || [];
        
        if (allocatedTo.length > 0) {
            const sharePerPerson = itemPrice / allocatedTo.length;
            allocatedTo.forEach(userId => {
                if (!shareMap[userId]) {
                    shareMap[userId] = 0;
                }
                shareMap[userId] += sharePerPerson;
            });
        }
    });
    
    return Object.entries(shareMap).map(([userId, shareAmount]) => ({
        userId: parseInt(userId),
        shareAmount: shareAmount
    }));
}

// POST /expenses - Create expense in a group
router.post('/', async (req, res) => {
    const userId = req.user.userId;
    const { description, amount, category, groupId, splitBetween, splitType, date, items } = req.body;

    try {
        // Check if this is an itemized expense
        const isItemized = items && Array.isArray(items) && items.length > 0;

        // Validate required fields based on expense type
        if (!description || !groupId) {
            return res.status(400).json({ 
                error: 'Missing required fields: description and groupId are required' 
            });
        }

        if (!isItemized && (!amount || !splitBetween || splitBetween.length === 0)) {
            return res.status(400).json({ 
                error: 'For non-itemized expenses: amount and splitBetween are required' 
            });
        }

        if (isItemized) {
            // Validate items
            for (const item of items) {
                if (!item.name || !item.price || !item.allocatedTo || item.allocatedTo.length === 0) {
                    return res.status(400).json({ 
                        error: 'Each item must have name, price, and at least one user in allocatedTo' 
                    });
                }
            }
        }

        // Check if user is a member of the group
        const membership = await checkGroupMembership(groupId, userId);
        if (!membership) {
            return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
        }

        // Get group members for validation
        const groupMembers = await prisma.groupMember.findMany({
            where: { groupId },
            select: { userId: true }
        });
        const memberIds = groupMembers.map(m => m.userId);

        let totalAmount;
        let shares;
        let itemsData = null;

        if (isItemized) {
            // Validate all users in item allocations are group members
            const allUserIds = new Set();
            items.forEach(item => {
                item.allocatedTo.forEach(id => allUserIds.add(id));
            });
            const invalidUsers = [...allUserIds].filter(id => !memberIds.includes(id));
            if (invalidUsers.length > 0) {
                return res.status(400).json({ 
                    error: 'Some users in item allocations are not members of the group' 
                });
            }

            // Calculate total amount from items
            totalAmount = items.reduce((sum, item) => {
                return sum + (parseFloat(item.price) * (item.quantity || 1));
            }, 0);

            // Calculate shares from items
            shares = calculateSharesFromItems(items);

            // Prepare items data for creation
            itemsData = items.map(item => ({
                name: item.name.trim(),
                price: parseFloat(item.price),
                quantity: item.quantity || 1,
                allocations: {
                    create: item.allocatedTo.map(uid => ({ userId: uid }))
                }
            }));
        } else {
            // Traditional expense handling
            const invalidUsers = splitBetween.filter(id => !memberIds.includes(id));
            if (invalidUsers.length > 0) {
                return res.status(400).json({ 
                    error: 'Some users in splitBetween are not members of the group' 
                });
            }

            totalAmount = parseFloat(amount);
            
            if (splitType === 'equal' || !splitType) {
                const shareAmount = totalAmount / splitBetween.length;
                shares = splitBetween.map(memberId => ({
                    userId: memberId,
                    shareAmount: shareAmount
                }));
            } else {
                const shareAmount = totalAmount / splitBetween.length;
                shares = splitBetween.map(memberId => ({
                    userId: memberId,
                    shareAmount: shareAmount
                }));
            }
        }

        // Create expense with shares and items
        const expenseData = {
            description: description.trim(),
            amount: totalAmount,
            category: category || 'other',
            groupId,
            paidBy: userId,
            splitType: isItemized ? 'itemized' : (splitType || 'equal'),
            date: date ? new Date(date) : new Date(),
            shares: {
                create: shares
            }
        };

        // Add items if itemized
        if (isItemized && itemsData) {
            expenseData.items = {
                create: itemsData
            };
        }

        const expense = await prisma.expense.create({
            data: expenseData,
            include: {
                payer: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                },
                shares: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true }
                        }
                    }
                },
                items: {
                    include: {
                        allocations: {
                            include: {
                                user: {
                                    select: { id: true, firstName: true, lastName: true, email: true }
                                }
                            }
                        }
                    }
                },
                group: {
                    select: { id: true, name: true }
                }
            }
        });

        res.status(201).json({ message: 'Expense created successfully', expense });
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /expenses - List expenses (optionally filtered by group)
router.get('/', async (req, res) => {
    const userId = req.user.userId;
    const { groupId } = req.query;

    try {
        let whereClause = {};

        if (groupId) {
            const gId = parseInt(groupId);
            // Check membership
            const membership = await checkGroupMembership(gId, userId);
            if (!membership) {
                return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
            }
            whereClause.groupId = gId;
        } else {
            // Get all expenses from groups the user is a member of
            const userGroups = await prisma.groupMember.findMany({
                where: { userId },
                select: { groupId: true }
            });
            const groupIds = userGroups.map(g => g.groupId);
            whereClause.groupId = { in: groupIds };
        }

        const expenses = await prisma.expense.findMany({
            where: whereClause,
            include: {
                payer: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                },
                shares: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true }
                        }
                    }
                },
                items: {
                    include: {
                        allocations: {
                            include: {
                                user: {
                                    select: { id: true, firstName: true, lastName: true, email: true }
                                }
                            }
                        }
                    }
                },
                group: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        res.status(200).json({ expenses });
    } catch (error) {
        console.error('Error fetching expenses:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /expenses/:id - Get expense details
router.get('/:id', async (req, res) => {
    const expenseId = parseInt(req.params.id);
    const userId = req.user.userId;

    try {
        const expense = await prisma.expense.findUnique({
            where: { id: expenseId },
            include: {
                payer: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                },
                shares: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true }
                        }
                    }
                },
                items: {
                    include: {
                        allocations: {
                            include: {
                                user: {
                                    select: { id: true, firstName: true, lastName: true, email: true }
                                }
                            }
                        }
                    }
                },
                group: {
                    select: { id: true, name: true }
                }
            }
        });

        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        // Check if user is a member of the group
        const membership = await checkGroupMembership(expense.groupId, userId);
        if (!membership) {
            return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
        }

        res.status(200).json({ expense });
    } catch (error) {
        console.error('Error fetching expense:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /expenses/:id - Update expense
router.put('/:id', async (req, res) => {
    const expenseId = parseInt(req.params.id);
    const userId = req.user.userId;
    const { description, amount, category, splitBetween, splitType, date } = req.body;

    try {
        const expense = await prisma.expense.findUnique({
            where: { id: expenseId }
        });

        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        // Check if user is the payer or a group admin
        const membership = await checkGroupMembership(expense.groupId, userId);
        if (!membership) {
            return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
        }

        const isPayer = expense.paidBy === userId;
        const isAdmin = membership.role === 'admin';

        if (!isPayer && !isAdmin) {
            return res.status(403).json({ error: 'Access denied. Only the payer or admins can update this expense.' });
        }

        // Build update data
        const updateData = {};
        if (description) updateData.description = description.trim();
        if (amount) updateData.amount = parseFloat(amount);
        if (category) updateData.category = category;
        if (splitType) updateData.splitType = splitType;
        if (date) updateData.date = new Date(date);

        // If splitBetween is updated, recalculate shares
        if (splitBetween && splitBetween.length > 0) {
            const totalAmount = amount ? parseFloat(amount) : parseFloat(expense.amount);
            const shareAmount = totalAmount / splitBetween.length;

            // Delete old shares and create new ones
            await prisma.expenseShare.deleteMany({
                where: { expenseId }
            });

            await prisma.expenseShare.createMany({
                data: splitBetween.map(memberId => ({
                    expenseId,
                    userId: memberId,
                    shareAmount
                }))
            });
        }

        const updatedExpense = await prisma.expense.update({
            where: { id: expenseId },
            data: updateData,
            include: {
                payer: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                },
                shares: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true }
                        }
                    }
                },
                group: {
                    select: { id: true, name: true }
                }
            }
        });

        res.status(200).json({ message: 'Expense updated successfully', expense: updatedExpense });
    } catch (error) {
        console.error('Error updating expense:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /expenses/:id - Delete expense
router.delete('/:id', async (req, res) => {
    const expenseId = parseInt(req.params.id);
    const userId = req.user.userId;

    try {
        const expense = await prisma.expense.findUnique({
            where: { id: expenseId }
        });

        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        // Check if user is the payer or a group admin
        const membership = await checkGroupMembership(expense.groupId, userId);
        if (!membership) {
            return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
        }

        const isPayer = expense.paidBy === userId;
        const isAdmin = membership.role === 'admin';

        if (!isPayer && !isAdmin) {
            return res.status(403).json({ error: 'Access denied. Only the payer or admins can delete this expense.' });
        }

        await prisma.expense.delete({
            where: { id: expenseId }
        });

        res.status(200).json({ message: 'Expense deleted successfully' });
    } catch (error) {
        console.error('Error deleting expense:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PATCH /expenses/:id/settle - Mark expense as settled
router.patch('/:id/settle', async (req, res) => {
    const expenseId = parseInt(req.params.id);
    const userId = req.user.userId;
    const { settled } = req.body;

    try {
        const expense = await prisma.expense.findUnique({
            where: { id: expenseId }
        });

        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        // Check membership
        const membership = await checkGroupMembership(expense.groupId, userId);
        if (!membership) {
            return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
        }

        const updatedExpense = await prisma.expense.update({
            where: { id: expenseId },
            data: { settled: settled !== undefined ? settled : true },
            include: {
                payer: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                },
                shares: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true }
                        }
                    }
                }
            }
        });

        res.status(200).json({ 
            message: `Expense marked as ${updatedExpense.settled ? 'settled' : 'unsettled'}`, 
            expense: updatedExpense 
        });
    } catch (error) {
        console.error('Error settling expense:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Helper function to recalculate expense shares from items
async function recalculateSharesFromItems(expenseId) {
    const expense = await prisma.expense.findUnique({
        where: { id: expenseId },
        include: {
            items: {
                include: {
                    allocations: true
                }
            }
        }
    });

    if (!expense || expense.items.length === 0) {
        return;
    }

    // Calculate new shares from items
    const shares = calculateSharesFromItems(
        expense.items.map(item => ({
            price: item.price,
            quantity: item.quantity,
            allocatedTo: item.allocations.map(a => a.userId)
        }))
    );

    // Calculate new total amount
    const totalAmount = expense.items.reduce((sum, item) => {
        return sum + (parseFloat(item.price) * item.quantity);
    }, 0);

    // Delete old shares and create new ones
    await prisma.expenseShare.deleteMany({
        where: { expenseId }
    });

    if (shares.length > 0) {
        await prisma.expenseShare.createMany({
            data: shares.map(s => ({
                expenseId,
                userId: s.userId,
                shareAmount: s.shareAmount
            }))
        });
    }

    // Update expense amount
    await prisma.expense.update({
        where: { id: expenseId },
        data: { amount: totalAmount }
    });
}

// POST /expenses/:id/items - Add item to expense
router.post('/:id/items', async (req, res) => {
    const expenseId = parseInt(req.params.id);
    const userId = req.user.userId;
    const { name, price, quantity, allocatedTo } = req.body;

    try {
        // Validate required fields
        if (!name || !price || !allocatedTo || allocatedTo.length === 0) {
            return res.status(400).json({ 
                error: 'Missing required fields: name, price, and allocatedTo are required' 
            });
        }

        const expense = await prisma.expense.findUnique({
            where: { id: expenseId }
        });

        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        // Check if user is the payer or a group admin
        const membership = await checkGroupMembership(expense.groupId, userId);
        if (!membership) {
            return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
        }

        const isPayer = expense.paidBy === userId;
        const isAdmin = membership.role === 'admin';

        if (!isPayer && !isAdmin) {
            return res.status(403).json({ error: 'Access denied. Only the payer or admins can modify this expense.' });
        }

        // Validate all users in allocatedTo are group members
        const groupMembers = await prisma.groupMember.findMany({
            where: { groupId: expense.groupId },
            select: { userId: true }
        });
        const memberIds = groupMembers.map(m => m.userId);
        const invalidUsers = allocatedTo.filter(id => !memberIds.includes(id));
        if (invalidUsers.length > 0) {
            return res.status(400).json({ 
                error: 'Some users in allocatedTo are not members of the group' 
            });
        }

        // Create the item
        const item = await prisma.expenseItem.create({
            data: {
                name: name.trim(),
                price: parseFloat(price),
                quantity: quantity || 1,
                expenseId,
                allocations: {
                    create: allocatedTo.map(uid => ({ userId: uid }))
                }
            },
            include: {
                allocations: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true }
                        }
                    }
                }
            }
        });

        // Update expense to itemized if not already
        if (expense.splitType !== 'itemized') {
            await prisma.expense.update({
                where: { id: expenseId },
                data: { splitType: 'itemized' }
            });
        }

        // Recalculate shares
        await recalculateSharesFromItems(expenseId);

        res.status(201).json({ message: 'Item added successfully', item });
    } catch (error) {
        console.error('Error adding item:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /expenses/:id/items/:itemId - Update item
router.put('/:id/items/:itemId', async (req, res) => {
    const expenseId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);
    const userId = req.user.userId;
    const { name, price, quantity, allocatedTo } = req.body;

    try {
        const expense = await prisma.expense.findUnique({
            where: { id: expenseId }
        });

        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        const item = await prisma.expenseItem.findUnique({
            where: { id: itemId }
        });

        if (!item || item.expenseId !== expenseId) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Check if user is the payer or a group admin
        const membership = await checkGroupMembership(expense.groupId, userId);
        if (!membership) {
            return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
        }

        const isPayer = expense.paidBy === userId;
        const isAdmin = membership.role === 'admin';

        if (!isPayer && !isAdmin) {
            return res.status(403).json({ error: 'Access denied. Only the payer or admins can modify this expense.' });
        }

        // Build update data
        const updateData = {};
        if (name) updateData.name = name.trim();
        if (price) updateData.price = parseFloat(price);
        if (quantity) updateData.quantity = quantity;

        // Update allocations if provided
        if (allocatedTo && allocatedTo.length > 0) {
            // Validate all users in allocatedTo are group members
            const groupMembers = await prisma.groupMember.findMany({
                where: { groupId: expense.groupId },
                select: { userId: true }
            });
            const memberIds = groupMembers.map(m => m.userId);
            const invalidUsers = allocatedTo.filter(id => !memberIds.includes(id));
            if (invalidUsers.length > 0) {
                return res.status(400).json({ 
                    error: 'Some users in allocatedTo are not members of the group' 
                });
            }

            // Delete old allocations and create new ones
            await prisma.itemAllocation.deleteMany({
                where: { itemId }
            });

            await prisma.itemAllocation.createMany({
                data: allocatedTo.map(uid => ({ itemId, userId: uid }))
            });
        }

        const updatedItem = await prisma.expenseItem.update({
            where: { id: itemId },
            data: updateData,
            include: {
                allocations: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true }
                        }
                    }
                }
            }
        });

        // Recalculate shares
        await recalculateSharesFromItems(expenseId);

        res.status(200).json({ message: 'Item updated successfully', item: updatedItem });
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /expenses/:id/items/:itemId - Delete item
router.delete('/:id/items/:itemId', async (req, res) => {
    const expenseId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);
    const userId = req.user.userId;

    try {
        const expense = await prisma.expense.findUnique({
            where: { id: expenseId }
        });

        if (!expense) {
            return res.status(404).json({ error: 'Expense not found' });
        }

        const item = await prisma.expenseItem.findUnique({
            where: { id: itemId }
        });

        if (!item || item.expenseId !== expenseId) {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Check if user is the payer or a group admin
        const membership = await checkGroupMembership(expense.groupId, userId);
        if (!membership) {
            return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
        }

        const isPayer = expense.paidBy === userId;
        const isAdmin = membership.role === 'admin';

        if (!isPayer && !isAdmin) {
            return res.status(403).json({ error: 'Access denied. Only the payer or admins can modify this expense.' });
        }

        await prisma.expenseItem.delete({
            where: { id: itemId }
        });

        // Recalculate shares
        await recalculateSharesFromItems(expenseId);

        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
