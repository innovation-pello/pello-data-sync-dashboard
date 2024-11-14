// Import required modules
import express from 'express';
import domainSync from '../modules/domain.js'; // Import domain sync logic
import { sendProgressUpdate } from '../server.js'; // Import sendProgressUpdate function
import { fetchAccessToken } from '../services/auth.js'; // Import fetchAccessToken for client credentials flow

// Initialize Express router
const router = express.Router();

// SSE route for Domain progress
router.get('/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream'); // Set SSE headers
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Establish SSE connection

    console.log('Client connected to Domain SSE.');

    // Add logic to handle client disconnection
    req.on('close', () => {
        console.log('Client disconnected from Domain SSE');
    });
});

// Route to fetch access token using client_credentials flow
router.get('/fetch-token', async (req, res) => {
    try {
        const accessToken = await fetchAccessToken(); // Fetch access token
        res.json({ accessToken }); // Respond with token
        console.log('Fetched access token for Domain:', accessToken);
    } catch (error) {
        console.error('Error fetching access token:', error.message);
        res.status(500).json({ error: 'Failed to fetch access token' });
    }
});

// Sync route for Domain
router.post('/sync', async (req, res) => {
    try {
        console.log('Starting Domain sync...');
        const result = await domainSync(sendProgressUpdate); // Execute sync
        res.status(200).json({ message: 'Domain.com.au sync successful', result });
    } catch (error) {
        console.error('Domain.com.au sync failed:', error.message);
        res.status(500).json({ message: 'Domain.com.au sync failed', error: error.message });
    }
});

export default router;