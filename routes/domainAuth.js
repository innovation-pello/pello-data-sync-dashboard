const express = require('express');
const { getAuthUrl, exchangeCodeForToken } = require('../services/auth'); // Only use what's necessary

const router = express.Router();

router.get('/authorize', (req, res) => {
    const authUrl = getAuthUrl();
    res.json({ authUrl });
});

router.get('/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).json({ error: 'Authorization code is required' });
    }

    try {
        const tokens = await exchangeCodeForToken(code);
        res.json({ message: 'Tokens received and stored successfully', tokens });
    } catch (error) {
        res.status(500).json({ error: 'Failed to exchange code for tokens' });
    }
});

module.exports = router;