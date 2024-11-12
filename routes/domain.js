// Import required modules
import express from 'express';
import domainSync from '../modules/domain.js'; // Import domain sync logic
import { sendProgressUpdate } from '../server.js'; // Import sendProgressUpdate function
import { getAuthUrl, exchangeCodeForToken } from '../services/auth.js'; // Import auth functions

// Initialize Express router
const router = express.Router();

// SSE route for Domain progress
router.get('/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream'); // Set SSE headers
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Establish SSE connection

    req.on('close', () => {
        console.log('Client disconnected from Domain SSE'); // Log disconnection
    });
});

// Route to get authorization URL
router.get('/authorize', (req, res) => {
    try {
        const authUrl = getAuthUrl(); // Generate auth URL
        res.json({ authUrl }); // Respond with URL
    } catch (error) {
        console.error('Error generating authorization URL:', error); // Log error
        res.status(500).json({ error: 'Failed to generate authorization URL' }); // Respond with error
    }
});

// Route to handle callback with authorization code
router.get('/callback', async (req, res) => {
    const { code } = req.query; // Extract authorization code

    if (!code) {
        return res.status(400).json({ error: 'Missing authorization code' }); // Respond if no code
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
        const result = await domainSync(sendProgressUpdate); // Execute sync
        res.status(200).json({ message: 'Domain.com.au sync successful', result }); // Respond success
    } catch (error) {
        console.error('Domain.com.au sync failed:', error.message); // Log failure
        res.status(500).json({ message: 'Domain.com.au sync failed', error: error.message }); // Respond failure
    }
});

// Export the router
export default router;