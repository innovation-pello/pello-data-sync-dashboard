import express from 'express';
import realestateSync from '../../platforms/realestate/modules/realestateSync.js';
import { sendProgressUpdate } from '../../platforms/shared/services/progress.js'; // Ensure progress management is centralized
import { logSyncMessage, logErrorMessage } from '../../platforms/shared/services/logger.js';

const router = express.Router();

/**
 * Sync route for Realestate.com.au
 */
router.post('/sync', async (req, res) => {
    try {
        logSyncMessage('Starting Realestate.com.au sync...');
        
        const result = await realestateSync(progress => {
            sendProgressUpdate(progress); // Use centralized progress update handler
        });

        const successCount = result.successCount || 0;
        const failureCount = result.failedCount || 0;
        const summary = `Realestate.com.au — Sync completed. Success: ${successCount}, Failed: ${failureCount}`;

        logSyncMessage(summary);
        res.status(200).json({ success: true, message: summary, data: { successCount, failureCount } });
    } catch (error) {
        const errorMessage = `Realestate.com.au — Sync failed. Error: ${error.message}`;
        logErrorMessage(errorMessage);
        res.status(500).json({ success: false, message: errorMessage });
    }
});

/**
 * SSE route for progress updates
 */
router.get('/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Ensure CORS support for SSE
    res.flushHeaders();

    res.write('data: Connection established\n\n'); // Initial SSE connection message

    req.on('close', () => {
        logSyncMessage('Client disconnected from Realestate.com.au SSE.');
    });
});

export default router;