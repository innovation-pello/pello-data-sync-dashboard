// api/server.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { getLastSyncTimestamp, logSyncMessage, addLogClient } from '../platforms/shared/services/logger.js';
import { fetchAccessToken, memoryTokens } from '../platforms/shared/services/auth.js';
import realestateRoutes from './realestate.js'; // Correct path for Realestate API routes
import domainRoutes from './domain.js'; // Correct path for Domain API routes
import logsRoutes from './logs.js'; // Added logs API route
import statusRoutes from './status.js'; // Added status API route
import { clients } from './platforms/shared/services/progress.js';

const app = express();
app.use(cors());
app.use(express.json());

// SSE clients
let clients = [];

/**
 * Helper to send progress updates to connected SSE clients
 * @param {object} progress - Progress update object
 */
function sendProgressUpdate(progress) {
    clients.forEach(client => {
        try {
            client.write(`data: ${JSON.stringify(progress)}\n\n`);
        } catch (err) {
            console.error('Error sending progress update:', err.message);
        }
    });
}

// Export SSE functionality
export { sendProgressUpdate, clients };

// API routes
app.use('/realestate', realestateRoutes);
app.use('/domain', domainRoutes);
app.use('/logs', logsRoutes); // Logs API
app.use('/status', statusRoutes); // Status API

// Middleware to ensure access token is valid
app.use(async (req, res, next) => {
    try {
        if (!memoryTokens.accessToken) {
            console.log('Access token missing, fetching a new one...');
            await fetchAccessToken();
        }
        next();
    } catch (error) {
        console.error('Error validating or refreshing token:', error.message);
        res.status(500).json({ error: 'Failed to refresh access token.' });
    }
});

// SSE route for log streaming
app.get('/logs/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    clients.push(res);
    console.log(`Client connected to logs stream. Active clients: ${clients.length}`);
    res.write('data: Connection established\n\n');

    req.on('close', () => {
        const index = clients.indexOf(res);
        if (index !== -1) clients.splice(index, 1);
        console.log(`Client disconnected from logs stream. Active clients: ${clients.length}`);
    });
});

export default app;