const express = require('express');
const router = express.Router();

// Test route
router.get('/ping', (req, res) => {
    res.send('Pong!');
});

module.exports = router;
