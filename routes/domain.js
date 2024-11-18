// Import required modules
import express from 'express';
import domainSync from '../modules/domain.js'; // Import domain sync logic
import { sendProgressUpdate } from '../server.js'; // Import sendProgressUpdate function
import { fetchAccessToken } from '../services/auth.js'; // Import fetchAccessToken for client credentials flow
import { logSyncMessage, logErrorMessage } from '../services/logger.js'; // Import logger for sync and error messages

// Initialize Express router
const router = express.Router();

// Sync route for Domain
router.post('/sync', async (req, res) => {
    try {
        console.log('Starting Domain sync...');
        const result = await domainSync(sendProgressUpdate); // Execute sync

        // Consolidate sync summary into a single message
        const successCount = result.successCount || 0;
        const failureCount = result.failureCount || 0;
        const summary = `Domain.com.au — Sync completed. Success: ${successCount}, Failed: ${failureCount}`;

        // Log a single success message
        logSyncMessage(summary);
        res.status(200).json({ message: summary }); // Respond with summary message
    } catch (error) {
        const errorMessage = `Domain.com.au — Sync failed. Error: ${error.message}`;

        // Log a single failure message
        logErrorMessage(errorMessage);
        console.error(errorMessage); // Backend logs
        res.status(500).json({ message: errorMessage }); // Respond with error message
    }
});

// SSE route for Domain progress
router.get('/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream'); // Set SSE headers
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Establish SSE connection

    req.on('close', () => {
        console.log('Client disconnected from Domain SSE.');
    });

    res.write('data: Connection established\n\n'); // Initial SSE event
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

export default router;