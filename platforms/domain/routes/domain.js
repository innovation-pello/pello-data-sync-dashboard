// Import required modules
import express from 'express';
import domainSync from '../modules/domainSync.js'; // Domain sync logic
import { sendProgressUpdate } from '../../../server.js'; // Correct path for progress updates
import { fetchAccessToken } from '../../shared/services/auth.js'; // Shared auth service
import { logSyncMessage, logErrorMessage } from '../../shared/services/logger.js'; // Shared logger

// Initialize Express router
const router = express.Router();

// Sync route for Domain.com.au
router.post('/sync', async (req, res) => {
    try {
        logSyncMessage('Starting Domain.com.au sync...');
        const result = await domainSync(progress => {
            sendProgressUpdate(progress); // Real-time progress updates
        });

        const successCount = result.successCount || 0;
        const failureCount = result.failedCount || 0;
        const summary = `Domain.com.au — Sync completed. Success: ${successCount}, Failed: ${failureCount}`;

        logSyncMessage(summary);
        res.status(200).json({ message: summary });
    } catch (error) {
        const errorMessage = `Domain.com.au — Sync failed. Error: ${error.message}`;
        logErrorMessage(errorMessage);
        res.status(500).json({ message: errorMessage });
    }
});

// SSE route for Domain progress updates
router.get('/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    res.write('data: Connection established\n\n');

    req.on('close', () => {
        logSyncMessage('Client disconnected from Domain.com.au SSE.');
    });
});

// Fetch access token route using client_credentials flow
router.get('/fetch-token', async (req, res) => {
    try {
        const accessToken = await fetchAccessToken();
        res.json({ accessToken });
        logSyncMessage('Fetched access token for Domain.com.au.');
    } catch (error) {
        const errorMessage = `Error fetching access token: ${error.message}`;
        logErrorMessage(errorMessage);
        res.status(500).json({ error: 'Failed to fetch access token' });
    }
});

export default router;