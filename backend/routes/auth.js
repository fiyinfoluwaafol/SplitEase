const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient();
require('dotenv').config()

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY

// Middleware for authentication jwt for protecting routes
// TODO: implement authenticateToken function to be used with user account access route

// Route Definitions for Registration, Login, Account Access (GET), Logout
// User Registration
router.post('/registration', async (req, res) => {
    const {firstName, lastName, email, password} = req.body;
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: {firstName, lastName, email, password: passwordHash}
        });

        res.json({ user: newUser});
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error'});
    }
});

// User Login
router.post('/login', async (req, res) => {

});

// User Account Access
router.get('/acct-access', async (req, res) => {

});

// User Logout
router.post('/logout', async (req, res) => {

});

module.exports = router;