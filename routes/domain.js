// Import required modules
const express = require('express');
const domainSync = require('../modules/domain'); // Domain sync module
const { sendProgressUpdate } = require('../server'); // Import sendProgressUpdate from server
const { getAuthUrl, exchangeCodeForToken } = require('../services/auth'); // Import auth functions

// Initialize Express router
const router = express.Router();

// SSE route for Domain progress
router.get('/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream'); // Set SSE headers
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Send headers to establish SSE connection

    req.on('close', () => {
        console.log('Client disconnected from Domain SSE'); // Log SSE disconnection
    });
});

// Route to get authorization URL
router.get('/authorize', (req, res) => {
    try {
        const authUrl = getAuthUrl(); // Generate auth URL
        res.json({ authUrl }); // Respond with auth URL
    } catch (error) {
        console.error('Error generating authorization URL:', error); // Log error
        res.status(500).json({ error: 'Failed to generate authorization URL' }); // Respond with error
    }
});

// Route to handle callback with authorization code
router.get('/callback', async (req, res) => {
    const { code } = req.query; // Extract authorization code from query

    if (!code) {
        return res.status(400).json({ error: 'Missing authorization code' }); // Error if code is missing
    }

    try {
        const tokens = await exchangeCodeForToken(code); // Exchange code for tokens
        res.json({ message: 'Authorization successful', tokens }); // Respond with tokens
    } catch (error) {
        console.error('Error during token exchange:', error); // Log error
        res.status(500).json({ error: 'Failed to exchange code for tokens' }); // Respond with error
    }
});

// Sync route for Domain
router.post('/sync', async (req, res) => {
    try {
        const result = await domainSync(sendProgressUpdate); // Perform sync
        res.status(200).json({ message: 'Domain.com.au sync successful', result }); // Respond with success
    } catch (error) {
        console.error('Domain.com.au sync failed:', error.message); // Log sync failure
        res.status(500).json({ message: 'Domain.com.au sync failed', error: error.message }); // Respond with error
    }
});

// Export the router
module.exports = router;