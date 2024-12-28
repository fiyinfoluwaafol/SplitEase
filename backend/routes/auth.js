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

// User Login

// User Account Access

// User Logout

module.exports = router;