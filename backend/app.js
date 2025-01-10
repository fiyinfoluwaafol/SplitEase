const express = require('express');
const cors = require('cors');
const prisma = require('@prisma/client');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const { PrismaClient } = prisma;
const prismaClient = new PrismaClient();

// Middleware
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
  }));
app.use(express.json());

// Routes
app.use('/', require('./routes/index'));

const authRoute = require('./routes/auth.js');
app.use('/auth', authRoute);

// Port Configuration
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
