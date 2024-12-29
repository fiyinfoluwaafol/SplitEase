require('dotenv').config();
const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY;

const authenticateToken = (req, res, next) => {
    // Extract token from cookies
    const token = req.cookies?.token;
    console.log('Token:', token);
    
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Verify the token
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }

        req.user = user; // Attach user payload to the request object
        next(); // Pass control to the next middleware/route handler
    });
};

module.exports = authenticateToken;
