import express from 'express';
import analyticsSync from '../modules/analyticsSync.js';
import { sendProgressUpdate } from '../../../server.js';
import { logSyncMessage, logErrorMessage } from '../../shared/services/logger.js';

const router = express.Router();

router.post('/sync', async (req, res) => {
    try {
        logSyncMessage('Starting Facebook & Instagram Analytics sync...');
        await analyticsSync(progress => sendProgressUpdate(progress));
        res.status(200).json({ message: 'Sync completed successfully.' });
    } catch (error) {
        const errorMessage = `Facebook & Instagram sync failed: ${error.message}`;
        logErrorMessage(errorMessage);
        res.status(500).json({ message: errorMessage });
    }
});

router.get('/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    res.write('data: Connection established\n\n');

    req.on('close', () => {
        logSyncMessage('Client disconnected from Facebook & Instagram progress SSE.');
    });
});

export default router;