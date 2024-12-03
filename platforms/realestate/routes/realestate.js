import express from 'express';
import realestateSync from '../modules/realestateSync.js'; // Correct sync logic path
import { sendProgressUpdate } from '../../../server.js'; // Correct progress handling path
import { logSyncMessage, logErrorMessage } from '../../shared/services/logger.js'; // Correct logger path

const router = express.Router();

// Sync route for Realestate.com.au
router.post('/sync', async (req, res) => {
    try {
        logSyncMessage('Starting Realestate.com.au sync...');
        const result = await realestateSync(sendProgressUpdate); // Pass sendProgressUpdate directly
        
        const { successCount = 0, failedCount = 0 } = result;
        const summary = {
            success: true,
            message: `Realestate.com.au — Sync completed.`,
            data: { successCount, failedCount },
        };

        logSyncMessage(`Sync Result: ${JSON.stringify(summary.data)}`); // Log detailed sync result
        res.status(200).json(summary); // Respond with summary
    } catch (error) {
        const errorMessage = {
            success: false,
            message: `Realestate.com.au — Sync failed.`,
            error: error.message,
        };

        logErrorMessage(`Sync Error: ${error.message}`); // Log detailed error
        res.status(500).json(errorMessage); // Respond with error details
    }
});

// SSE route for Realestate progress
router.get('/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream'); // Set SSE headers
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Establish SSE connection

    res.write('data: Connection established\n\n'); // Initial SSE event

    req.on('close', () => {
        logSyncMessage('Client disconnected from Realestate progress SSE.');
    });
});

export default router;