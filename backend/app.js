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
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
  }));
app.use(express.json());

// Routes
app.use('/', require('./routes/index'));

// Auth routes
const authRoute = require('./routes/auth.js');
app.use('/auth', authRoute);

// Groups routes
const groupsRoute = require('./routes/groups.js');
app.use('/groups', groupsRoute);

// Expenses routes
const expensesRoute = require('./routes/expenses.js');
app.use('/expenses', expensesRoute);

// Payments routes
const paymentsRoute = require('./routes/payments.js');
app.use('/payments', paymentsRoute);

// Balances routes
const balancesRoute = require('./routes/balances.js');
app.use('/balances', balancesRoute);

// Port Configuration
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
