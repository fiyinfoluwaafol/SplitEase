const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const express = require('express');
const router = express.Router();

const authenticateToken = require('../middlewares/authenticateToken');

// All routes require authentication
router.use(authenticateToken);

// Helper function to calculate balances
async function calculateUserBalances(userId, groupId = null) {
    // Get all expenses where user is involved (either as payer or in shares)
    let expenseWhereClause = {
        settled: false,
        OR: [
            { paidBy: userId },
            { shares: { some: { userId } } }
        ]
    };

    if (groupId) {
        expenseWhereClause.groupId = groupId;
    }

    const expenses = await prisma.expense.findMany({
        where: expenseWhereClause,
        include: {
            shares: true,
            payer: {
                select: { id: true, firstName: true, lastName: true, email: true }
            }
        }
    });

    // Get all payments involving the user
    let paymentWhereClause = {
        OR: [
            { fromUserId: userId },
            { toUserId: userId }
        ]
    };

    if (groupId) {
        paymentWhereClause.groupId = groupId;
    }

    const payments = await prisma.payment.findMany({
        where: paymentWhereClause,
        include: {
            from: {
                select: { id: true, firstName: true, lastName: true, email: true }
            },
            to: {
                select: { id: true, firstName: true, lastName: true, email: true }
            }
        }
    });

    // Calculate balances per user
    const balances = {};

    // Process expenses
    for (const expense of expenses) {
        if (expense.paidBy === userId) {
            // User paid - others owe them their share
            for (const share of expense.shares) {
                if (share.userId !== userId) {
                    if (!balances[share.userId]) {
                        balances[share.userId] = { amount: 0, user: null };
                    }
                    balances[share.userId].amount += parseFloat(share.shareAmount);
                }
            }
        } else {
            // Someone else paid - user owes their share to the payer
            const userShare = expense.shares.find(s => s.userId === userId);
            if (userShare) {
                if (!balances[expense.paidBy]) {
                    balances[expense.paidBy] = { amount: 0, user: expense.payer };
                }
                balances[expense.paidBy].amount -= parseFloat(userShare.shareAmount);
            }
        }
    }

    // Process payments
    for (const payment of payments) {
        if (payment.fromUserId === userId) {
            // User sent payment - reduces what they owe
            if (!balances[payment.toUserId]) {
                balances[payment.toUserId] = { amount: 0, user: payment.to };
            }
            balances[payment.toUserId].amount += parseFloat(payment.amount);
        } else {
            // User received payment - reduces what others owe them
            if (!balances[payment.fromUserId]) {
                balances[payment.fromUserId] = { amount: 0, user: payment.from };
            }
            balances[payment.fromUserId].amount -= parseFloat(payment.amount);
        }
    }

    // Fetch user info for any missing users
    for (const otherUserId of Object.keys(balances)) {
        if (!balances[otherUserId].user) {
            const user = await prisma.user.findUnique({
                where: { id: parseInt(otherUserId) },
                select: { id: true, firstName: true, lastName: true, email: true }
            });
            balances[otherUserId].user = user;
        }
    }

    // Calculate totals
    let youOwe = 0;
    let youAreOwed = 0;

    const detailedBalances = Object.entries(balances)
        .filter(([_, data]) => Math.abs(data.amount) > 0.01)
        .map(([otherUserId, data]) => {
            const amount = data.amount;
            if (amount > 0) {
                youAreOwed += amount;
            } else {
                youOwe += Math.abs(amount);
            }
            return {
                user: data.user,
                amount: amount,
                type: amount > 0 ? 'owed' : 'owes' // owed = they owe you, owes = you owe them
            };
        });

    return {
        youOwe,
        youAreOwed,
        totalBalance: youAreOwed - youOwe,
        detailed: detailedBalances
    };
}

// GET /balances - Get current user's overall balances
router.get('/', async (req, res) => {
    const userId = req.user.userId;

    try {
        const balances = await calculateUserBalances(userId);
        res.status(200).json({ balances });
    } catch (error) {
        console.error('Error calculating balances:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET /balances/group/:groupId - Get balances within a group
router.get('/group/:groupId', async (req, res) => {
    const userId = req.user.userId;
    const groupId = parseInt(req.params.groupId);

    try {
        // Check membership
        const membership = await prisma.groupMember.findUnique({
            where: { groupId_userId: { groupId, userId } }
        });

        if (!membership) {
            return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
        }

        const balances = await calculateUserBalances(userId, groupId);

        // Also get group info
        const group = await prisma.group.findUnique({
            where: { id: groupId },
            select: { id: true, name: true }
        });

        res.status(200).json({ group, balances });
    } catch (error) {
        console.error('Error calculating group balances:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
