import express from 'express';
import realestateSync from '../modules/realestate.js'; // Import Realestate sync logic
import { sendProgressUpdate, clients } from '../server.js'; // Import progress handling
import { logSyncMessage, logErrorMessage } from '../services/logger.js'; // Import logger for sync and error messages

const router = express.Router();

// Sync route for Realestate.com.au
router.post('/sync', async (req, res) => {
    try {
        //console.log('Starting Realestate.com.au sync...');
        
        const result = await realestateSync(progress => {
            sendProgressUpdate(progress); // Real-time progress updates
        });

        // Consolidate sync summary into a single message
        const successCount = result.successCount || 0;
        const failureCount = result.failureCount || 0;
        const summary = `Realestate.com.au — Sync completed. Success: ${successCount}, Failed: ${failureCount}`;

        // Log a single success message
        logSyncMessage(summary);
        res.status(200).json({ message: summary }); // Respond with summary message
    } catch (error) {
        const errorMessage = `Realestate.com.au — Sync failed. Error: ${error.message}`;

        // Log a single failure message
        logErrorMessage(errorMessage);
        console.error(errorMessage); // Backend logs
        res.status(500).json({ message: errorMessage }); // Respond with error message
    }
});

// SSE route for Realestate progress
router.get('/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream'); // Set SSE headers
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Establish SSE connection

    // Add the client to active SSE clients
    clients.push(res);
    console.log(`Client connected to Realestate progress SSE. Active clients: ${clients.length}`);

    req.on('close', () => {
        clients.splice(clients.indexOf(res), 1); // Remove client on disconnect
        console.log(`Client disconnected from Realestate progress SSE. Active clients: ${clients.length}`);
    });

    res.write('data: Connection established\n\n'); // Initial SSE event
});

export default router;