const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const express = require('express');
const router = express.Router();

const authenticateToken = require('../middlewares/authenticateToken');

// All routes require authentication
router.use(authenticateToken);

// POST /groups - Create a new group
router.post('/', async (req, res) => {
    const { name, description } = req.body;
    const userId = req.user.userId;

    try {
        if (!name || name.trim() === '') {
            return res.status(400).json({ error: 'Group name is required' });
        }

        const group = await prisma.group.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                createdBy: userId,
                members: {
                    create: {
                        userId: userId,
                        role: 'admin'
                    }
                }
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true }
                        }
                    }
                }
            }
        });

        res.status(201).json({ message: 'Group created successfully', group });
    } catch (error) {
        console.error('Error creating group:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /groups - List user's groups
router.get('/', async (req, res) => {
    const userId = req.user.userId;

    try {
        const groups = await prisma.group.findMany({
            where: {
                members: {
                    some: { userId: userId }
                }
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true }
                        }
                    }
                },
                _count: {
                    select: { expenses: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Calculate total expenses for each group
        const groupsWithTotals = await Promise.all(
            groups.map(async (group) => {
                const totalExpenses = await prisma.expense.aggregate({
                    where: { groupId: group.id },
                    _sum: { amount: true }
                });
                return {
                    ...group,
                    totalExpenses: totalExpenses._sum.amount || 0
                };
            })
        );

        res.status(200).json({ groups: groupsWithTotals });
    } catch (error) {
        console.error('Error fetching groups:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /groups/:id - Get group details with members and expenses
router.get('/:id', async (req, res) => {
    const groupId = parseInt(req.params.id);
    const userId = req.user.userId;

    try {
        const group = await prisma.group.findUnique({
            where: { id: groupId },
            include: {
                creator: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                },
                members: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true }
                        }
                    }
                },
                expenses: {
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
                    },
                    orderBy: { date: 'desc' }
                }
            }
        });

        if (!group) {
            return res.status(404).json({ error: 'Group not found' });
        }

        // Check if user is a member
        const isMember = group.members.some(m => m.userId === userId);
        if (!isMember) {
            return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
        }

        // Calculate total expenses
        const totalExpenses = await prisma.expense.aggregate({
            where: { groupId: group.id },
            _sum: { amount: true }
        });

        res.status(200).json({ 
            group: {
                ...group,
                totalExpenses: totalExpenses._sum.amount || 0
            }
        });
    } catch (error) {
        console.error('Error fetching group:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// PUT /groups/:id - Update group (admin only)
router.put('/:id', async (req, res) => {
    const groupId = parseInt(req.params.id);
    const userId = req.user.userId;
    const { name, description } = req.body;

    try {
        // Check if user is admin
        const membership = await prisma.groupMember.findUnique({
            where: {
                groupId_userId: { groupId, userId }
            }
        });

        if (!membership) {
            return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
        }

        if (membership.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Only admins can update the group.' });
        }

        const updatedGroup = await prisma.group.update({
            where: { id: groupId },
            data: {
                name: name?.trim(),
                description: description?.trim()
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true }
                        }
                    }
                }
            }
        });

        res.status(200).json({ message: 'Group updated successfully', group: updatedGroup });
    } catch (error) {
        console.error('Error updating group:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /groups/:id - Delete group (admin only)
router.delete('/:id', async (req, res) => {
    const groupId = parseInt(req.params.id);
    const userId = req.user.userId;

    try {
        // Check if user is admin
        const membership = await prisma.groupMember.findUnique({
            where: {
                groupId_userId: { groupId, userId }
            }
        });

        if (!membership) {
            return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
        }

        if (membership.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Only admins can delete the group.' });
        }

        await prisma.group.delete({
            where: { id: groupId }
        });

        res.status(200).json({ message: 'Group deleted successfully' });
    } catch (error) {
        console.error('Error deleting group:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// POST /groups/:id/members - Add member by email
router.post('/:id/members', async (req, res) => {
    const groupId = parseInt(req.params.id);
    const userId = req.user.userId;
    const { email } = req.body;

    try {
        // Check if requester is a member of the group
        const membership = await prisma.groupMember.findUnique({
            where: {
                groupId_userId: { groupId, userId }
            }
        });

        if (!membership) {
            return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
        }

        // Find user by email
        const userToAdd = await prisma.user.findUnique({
            where: { email }
        });

        if (!userToAdd) {
            return res.status(404).json({ error: 'User not found with that email' });
        }

        // Check if user is already a member
        const existingMembership = await prisma.groupMember.findUnique({
            where: {
                groupId_userId: { groupId, userId: userToAdd.id }
            }
        });

        if (existingMembership) {
            return res.status(400).json({ error: 'User is already a member of this group' });
        }

        // Add member
        const newMember = await prisma.groupMember.create({
            data: {
                groupId,
                userId: userToAdd.id,
                role: 'member'
            },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                }
            }
        });

        res.status(201).json({ message: 'Member added successfully', member: newMember });
    } catch (error) {
        console.error('Error adding member:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE /groups/:id/members/:userId - Remove member
router.delete('/:id/members/:memberId', async (req, res) => {
    const groupId = parseInt(req.params.id);
    const memberIdToRemove = parseInt(req.params.memberId);
    const userId = req.user.userId;

    try {
        // Check if requester is admin or removing themselves
        const requesterMembership = await prisma.groupMember.findUnique({
            where: {
                groupId_userId: { groupId, userId }
            }
        });

        if (!requesterMembership) {
            return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
        }

        const isRemovingSelf = userId === memberIdToRemove;
        const isAdmin = requesterMembership.role === 'admin';

        if (!isRemovingSelf && !isAdmin) {
            return res.status(403).json({ error: 'Access denied. Only admins can remove other members.' });
        }

        // Check if target is a member
        const targetMembership = await prisma.groupMember.findUnique({
            where: {
                groupId_userId: { groupId, userId: memberIdToRemove }
            }
        });

        if (!targetMembership) {
            return res.status(404).json({ error: 'Member not found in this group' });
        }

        // Prevent removing the last admin
        if (targetMembership.role === 'admin') {
            const adminCount = await prisma.groupMember.count({
                where: { groupId, role: 'admin' }
            });

            if (adminCount <= 1) {
                return res.status(400).json({ error: 'Cannot remove the last admin. Transfer admin role first.' });
            }
        }

        await prisma.groupMember.delete({
            where: {
                groupId_userId: { groupId, userId: memberIdToRemove }
            }
        });

        res.status(200).json({ message: 'Member removed successfully' });
    } catch (error) {
        console.error('Error removing member:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
