import express from 'express';
import domainSync from '../../platforms/domain/modules/domainSync.js'; // Adjusted path for Domain sync logic
import { sendProgressUpdate } from '../server.js'; // SSE for progress updates
import { logSyncMessage, logErrorMessage } from '../../platforms/shared/services/logger.js'; // Adjusted logger path

const router = express.Router();

/**
 * Sync route for Domain.com.au
 */
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
        res.status(200).json({
            success: true,
            message: summary,
            data: { successCount, failureCount },
        });
    } catch (error) {
        const errorMessage = `Domain.com.au — Sync failed. Error: ${error.message}`;
        logErrorMessage(errorMessage);
        res.status(500).json({
            success: false,
            message: errorMessage,
        });
    }
});

/**
 * SSE route for Domain progress updates
 */
router.get('/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Ensure CORS support for SSE
    res.flushHeaders();

    res.write('data: Connection established\n\n'); // Notify the client of the connection

    req.on('close', () => {
        logSyncMessage('Client disconnected from Domain.com.au SSE.');
    });
});

export default router;