import express from 'express';
import analyticsSync from '../modules/analyticsSync.js';
import { sendProgressUpdate } from '../../../server.js';
import { logSyncMessage, logErrorMessage } from '../../shared/services/logger.js';

const router = express.Router();

/**
 * Sync route for Facebook & Instagram Analytics
 */
router.post('/sync', async (req, res) => {
    try {
        logSyncMessage('Starting Facebook & Instagram Analytics sync...');
        
        await analyticsSync(progress => sendProgressUpdate(progress));

        const successMessage = 'Facebook & Instagram Analytics sync completed successfully.';
        logSyncMessage(successMessage);
        res.status(200).json({
            success: true,
            message: successMessage,
        });
    } catch (error) {
        const errorMessage = `Facebook & Instagram sync failed: ${error.message}`;
        logErrorMessage(errorMessage);
        res.status(500).json({
            success: false,
            message: errorMessage,
        });
    }
});

/**
 * SSE route for Facebook & Instagram progress updates
 */
router.get('/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow cross-origin SSE requests
    res.flushHeaders();

    res.write('data: Connection established\n\n'); // Notify the client of the connection

    req.on('close', () => {
        logSyncMessage('Client disconnected from Facebook & Instagram progress SSE.');
    });
});

export default router;