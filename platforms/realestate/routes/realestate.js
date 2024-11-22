import express from 'express';
import realestateSync from '../modules/realestateSync.js'; // Correct sync logic path
import { sendProgressUpdate, clients } from '../../../server.js'; // Correct progress handling path
import { logSyncMessage, logErrorMessage } from '../../shared/services/logger.js'; // Correct logger path

const router = express.Router();

// Sync route for Realestate.com.au
router.post('/sync', async (req, res) => {
    try {
        //console.log('Starting Realestate.com.au sync...');
        
        const result = await realestateSync(sendProgressUpdate); // Pass sendProgressUpdate directly
        
        const { successCount = 0, failedCount = 0 } = result;
        const summary = `Realestate.com.au — Sync completed. Success: ${successCount}, Failed: ${failedCount}`;

        logSyncMessage(summary); // Log the sync result
        res.status(200).json({ message: summary }); // Respond with summary message
    } catch (error) {
        const errorMessage = `Realestate.com.au — Sync failed. Error: ${error.message}`;

        logErrorMessage(errorMessage); // Log the error
        console.error(errorMessage); // Log to console
        res.status(500).json({ message: errorMessage }); // Respond with error message
    }
});

// SSE route for Realestate progress
router.get('/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream'); // Set SSE headers
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Establish SSE connection

    clients.push(res); // Add the client to active SSE clients
    console.log(`Client connected to Realestate progress SSE. Active clients: ${clients.length}`);

    req.on('close', () => {
        clients.splice(clients.indexOf(res), 1); // Remove client on disconnect
        console.log(`Client disconnected from Realestate progress SSE. Active clients: ${clients.length}`);
    });

    res.write('data: Connection established\n\n'); // Initial SSE event
});

export default router;