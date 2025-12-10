# SplitEase

SplitEase is a collaborative expense management web application designed to simplify the process of managing and splitting expenses within groups. The app allows users to create and manage shared expenses, automate the splitting process, and track payments, all within an intuitive and secure platform.

## Features

- **User Authentication**: Secure JWT-based authentication with user registration and login
- **Bill Splitting**: Dynamic splitting of bills among selected users with custom allocation options
- **Expense Tracking**: Track and categorize expenses (food, utilities, travel, etc.)
- **Group Management**: Create and manage groups, invite members via email
- **Payment Tracking**: Monitor payments made by users against shared expenses
- **Notifications**: Email notifications and reminders for upcoming payments

## Tech Stack

### Backend
- **Node.js** with **Express.js**
- **Prisma** ORM with **PostgreSQL** database
- **JWT** for authentication
- **bcrypt** for password hashing
- **Nodemailer** for email notifications

### Frontend
- **React** with **Vite**
- **React Router** for navigation

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher)
- **npm** or **yarn**
- **PostgreSQL** database
- **Git**

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SplitEase
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   ```

## Environment Setup

### Backend Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/splitease?schema=public"
PORT=3000
JWT_SECRET=your-secret-key-here
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
```

### Frontend Environment Variables

Create a `.env` file in the `frontend` directory (if needed):

```env
VITE_API_URL=http://localhost:3000
```

## Database Setup

1. **Create a PostgreSQL database**
   ```bash
   createdb splitease
   ```

2. **Run Prisma migrations**
   ```bash
   cd backend
   npx prisma migrate dev
   ```

3. **Generate Prisma Client** (if needed)
   ```bash
   npx prisma generate
   ```

## Running the Application

### Development Mode

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```
   The backend will run on `http://localhost:3000`

2. **Start the frontend development server** (in a new terminal)
   ```bash
   cd frontend
   npm run dev
   ```
   The frontend will run on `http://localhost:5173`

### Production Mode

1. **Build the frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start the backend**
   ```bash
   cd backend
   npm start
   ```

## Project Structure

```
SplitEase/
├── backend/
│   ├── app.js                 # Express app entry point
│   ├── middlewares/          # Authentication middleware
│   ├── routes/               # API routes
│   ├── prisma/               # Prisma schema and migrations
│   └── utils/                # Utility functions (email service, etc.)
│
└── frontend/
    ├── src/
    │   ├── components/       # React components
    │   ├── pages/            # Page components
    │   └── App.jsx           # Main app component
    └── public/               # Static assets
```

## API Endpoints

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /` - Health check
