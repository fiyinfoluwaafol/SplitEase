const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient();
require('dotenv').config()

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY

// Middleware for authentication jwt for protecting routes
const authenticateToken = require('../middlewares/authenticateToken')

// Route Definitions for Registration, Login, Account Access (GET), Logout
// User Registration
router.post('/registration', async (req, res) => {
    const {firstName, lastName, email, password} = req.body;
    try {
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }
        // Checks to see if email already exists before creating account
        const existingUser = await prisma.user.findFirst({
            where: { email }
          });
        
        if (existingUser){
            return res.status(400).json({ error: 'Email already in use' });
        }

        const passwordHash = await bcrypt.hash(password, 10);   // Hashes password before storing in database
        const newUser = await prisma.user.create({
            data: {firstName, lastName, email, password: passwordHash}
        });

        // Returns the newly created user data in response
        res.status(201).json({ message: "Account successfully created", user: { id: newUser.id, email: newUser.email } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error'});
    }
});

// User Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if the user exists
        const user = await prisma.user.findFirst({
            where: { email },
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Verify the password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Generate a JWT
        const token = jwt.sign(
            { userId: user.id, email: user.email }, // Payload
            SECRET_KEY, // Secret key
            { expiresIn: '1h' } // Token expiration
        );

        // Set the token as a cookie
        res.cookie('token', token, {
            httpOnly: true, // Prevent client-side JavaScript from accessing the cookie
            secure: false, // Use `true` in production when using HTTPS
            sameSite: 'strict', // Protect against CSRF attacks
        });

        res.status(200).json({ message: 'Login successful' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User Account Access
router.get('/acct-access', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId; // `userId` comes from the decoded token payload
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        res.status(200).json({ user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error.' });
    }
});

// User Logout
router.post('/logout', async (req, res) => {
    res.clearCookie('token', {
        httpOnly: true, // Must match the httpOnly setting from the login endpoint
        secure: false,  // Use 'true' in production with HTTPS
        sameSite: 'strict',
    });
    res.status(200).json({ message: 'Logged out successfully.' });
});

module.exports = router;