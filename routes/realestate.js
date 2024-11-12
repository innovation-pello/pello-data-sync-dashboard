import express from 'express';
import realestateSync from '../modules/realestate.js'; // Ensure this is ES module
import { sendProgressUpdate, clients } from '../server.js'; // Import from server.js

const router = express.Router();

// Sync route for Realestate.com.au
router.post('/sync', async (req, res) => {
    try {
        const result = await realestateSync(sendProgressUpdate);
        res.status(200).json({ message: 'Realestate.com.au sync successful', result });
    } catch (error) {
        console.error('Realestate.com.au sync failed:', error.message); // Backend logs
        res.status(500).json({ message: 'Realestate.com.au sync failed', error: error.message }); // Client response
    }
});

// SSE route for progress updates
router.get('/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // Send headers to establish SSE

    clients.push(res); // Add client to active clients
    console.log(`Client connected: ${clients.length} active clients`);

    req.on('close', () => {
        clients.splice(clients.indexOf(res), 1); // Remove client on disconnect
        console.log(`Client disconnected: ${clients.length} active clients`);
    });
});

export default router; // Default export