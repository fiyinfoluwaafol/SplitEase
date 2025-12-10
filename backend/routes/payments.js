const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const express = require('express');
const router = express.Router();

const authenticateToken = require('../middlewares/authenticateToken');

// All routes require authentication
router.use(authenticateToken);

// POST /payments - Record a payment
router.post('/', async (req, res) => {
    const userId = req.user.userId;
    const { toUserId, amount, note, groupId, date } = req.body;

    try {
        // Validate required fields
        if (!toUserId || !amount) {
            return res.status(400).json({ error: 'Missing required fields: toUserId and amount are required' });
        }

        if (toUserId === userId) {
            return res.status(400).json({ error: 'Cannot make a payment to yourself' });
        }

        // Verify recipient exists
        const recipient = await prisma.user.findUnique({
            where: { id: toUserId }
        });

        if (!recipient) {
            return res.status(404).json({ error: 'Recipient user not found' });
        }

        // If groupId is provided, verify both users are members of the group
        if (groupId) {
            const senderMembership = await prisma.groupMember.findUnique({
                where: { groupId_userId: { groupId, userId } }
            });

            const recipientMembership = await prisma.groupMember.findUnique({
                where: { groupId_userId: { groupId, userId: toUserId } }
            });

            if (!senderMembership || !recipientMembership) {
                return res.status(400).json({ error: 'Both users must be members of the group' });
            }
        }

        const payment = await prisma.payment.create({
            data: {
                fromUserId: userId,
                toUserId,
                amount: parseFloat(amount),
                note: note?.trim() || null,
                groupId: groupId || null,
                date: date ? new Date(date) : new Date()
            },
            include: {
                from: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                },
                to: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                },
                group: {
                    select: { id: true, name: true }
                }
            }
        });

        res.status(201).json({ message: 'Payment recorded successfully', payment });
    } catch (error) {
        console.error('Error recording payment:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /payments - List payments (optionally filtered by group)
router.get('/', async (req, res) => {
    const userId = req.user.userId;
    const { groupId } = req.query;

    try {
        let whereClause = {
            OR: [
                { fromUserId: userId },
                { toUserId: userId }
            ]
        };

        if (groupId) {
            const gId = parseInt(groupId);
            // Check membership
            const membership = await prisma.groupMember.findUnique({
                where: { groupId_userId: { groupId: gId, userId } }
            });

            if (!membership) {
                return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
            }

            whereClause = {
                AND: [
                    { groupId: gId },
                    {
                        OR: [
                            { fromUserId: userId },
                            { toUserId: userId }
                        ]
                    }
                ]
            };
        }

        const payments = await prisma.payment.findMany({
            where: whereClause,
            include: {
                from: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                },
                to: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                },
                group: {
                    select: { id: true, name: true }
                }
            },
            orderBy: { date: 'desc' }
        });

        res.status(200).json({ payments });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
