const express = require('express');
const realestateSync = require('../modules/realestate');
const { sendProgressUpdate } = require('../server');

const router = express.Router();

router.post('/sync', async (req, res) => {
    try {
        const result = await realestateSync(sendProgressUpdate);
        res.status(200).json({ message: 'Realestate.com.au sync successful', result });
    } catch (error) {
        console.error('Realestate.com.au sync failed:', error.message);
        res.status(500).json({ message: 'Realestate.com.au sync failed', error: error.message });
    }
});

router.get('/progress', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clients = require('../server').clients; // Access clients array
    clients.push(res);
    console.log(`Client connected: ${clients.length} active clients`);

    req.on('close', () => {
        clients.splice(clients.indexOf(res), 1);
        console.log(`Client disconnected: ${clients.length} active clients`);
    });
});

module.exports = router;