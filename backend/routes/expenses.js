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

// POST /expenses - Create expense in a group
router.post('/', async (req, res) => {
    const userId = req.user.userId;
    const { description, amount, category, groupId, splitBetween, splitType, date } = req.body;

    try {
        // Validate required fields
        if (!description || !amount || !groupId || !splitBetween || splitBetween.length === 0) {
            return res.status(400).json({ 
                error: 'Missing required fields: description, amount, groupId, and splitBetween are required' 
            });
        }

        // Check if user is a member of the group
        const membership = await checkGroupMembership(groupId, userId);
        if (!membership) {
            return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
        }

        // Verify all users in splitBetween are members of the group
        const groupMembers = await prisma.groupMember.findMany({
            where: { groupId },
            select: { userId: true }
        });
        const memberIds = groupMembers.map(m => m.userId);

        const invalidUsers = splitBetween.filter(id => !memberIds.includes(id));
        if (invalidUsers.length > 0) {
            return res.status(400).json({ 
                error: 'Some users in splitBetween are not members of the group' 
            });
        }

        // Calculate share amounts based on split type
        const totalAmount = parseFloat(amount);
        let shares;

        if (splitType === 'equal' || !splitType) {
            const shareAmount = totalAmount / splitBetween.length;
            shares = splitBetween.map(memberId => ({
                userId: memberId,
                shareAmount: shareAmount
            }));
        } else {
            // For custom splits, expect splitBetween to contain objects with userId and shareAmount
            // For now, default to equal split
            const shareAmount = totalAmount / splitBetween.length;
            shares = splitBetween.map(memberId => ({
                userId: memberId,
                shareAmount: shareAmount
            }));
        }

        // Create expense with shares
        const expense = await prisma.expense.create({
            data: {
                description: description.trim(),
                amount: totalAmount,
                category: category || 'other',
                groupId,
                paidBy: userId,
                splitType: splitType || 'equal',
                date: date ? new Date(date) : new Date(),
                shares: {
                    create: shares
                }
            },
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

module.exports = router;
