// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Import required modules
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getLastSyncTimestamp, logSyncMessage, addLogClient } from './platforms/shared/services/logger.js';
import { fetchAccessToken, memoryTokens } from './platforms/shared/services/auth.js';


// Determine __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// SSE clients array for progress updates
let clients = [];

/**
 * Function to send progress updates to SSE clients
 * @param {object} progress - Progress update object.
 */
function sendProgressUpdate(progress) {
    if (!progress || typeof progress !== 'object') return;

    clients.forEach(client => {
        try {
            client.write(`data: ${JSON.stringify(progress)}\n\n`);
        } catch (err) {
            console.error('Failed to send progress update:', err.message);
        }
    });
}

// Export SSE functionality
export { clients, sendProgressUpdate };

// Import platform-specific routes
import realestateRoutes from './platforms/realestate/routes/realestate.js';
import domainRoutes from './platforms/domain/routes/domain.js';
import analyticsRoutes from './platforms/facebook-instagram/routes/analytics.js'; // Facebook-Instagram platform routes

// Use platform-specific routes
app.use('/api/realestate', realestateRoutes);
app.use('/api/domain', domainRoutes);
app.use('/api/analytics', analyticsRoutes); // Facebook-Instagram analytics routes

// Middleware to ensure access token is valid for every request
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

// Route for SSE real-time log streaming
app.get('/logs/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    addLogClient(res); // Add client for real-time log streaming
    res.write('data: Connection established\n\n'); // Initial connection message

    console.log('Client connected to /logs/stream');
    req.on('close', () => {
        console.log('Client disconnected from logs stream.');
    });
});

// Platform Status Route
app.get('/api/status', (req, res) => {
    console.log('DOMAIN_ACCESS_TOKEN (memory):', memoryTokens.accessToken || 'Not set');

    const platforms = [
        { platform: 'Realestate.com.au', status: 'Connected', lastSync: getLastSyncTimestamp('Realestate.com.au') },
        { platform: 'Domain.com.au', status: memoryTokens.accessToken ? 'Connected' : 'Not Authorized', lastSync: getLastSyncTimestamp('Domain.com.au') },
        { platform: 'Facebook & Instagram', status: memoryTokens.accessToken ? 'Connected' : 'Not Authorized', lastSync: getLastSyncTimestamp('Facebook & Instagram') }
    ];

    res.json(platforms);
});

// Logs Route for fetching logs from file
app.get('/api/logs', (req, res) => {
    const logsDir = path.join(__dirname, 'logs');
    const logsFilePath = path.join(logsDir, 'sync-logs.txt');

    if (!fs.existsSync(logsFilePath)) {
        return res.status(200).json([]);
    }

    fs.readFile(logsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Failed to read logs:', err.message);
            return res.status(500).json({ error: 'Failed to retrieve logs' });
        }

        const logs = data.trim().split('\n').filter(log => log);
        res.json(Array.from(new Set(logs)));
    });
});

// Fetch tokens at server startup
(async () => {
    console.log('Fetching access token on server startup...');
    try {
        await fetchAccessToken();
        console.log('Access token successfully fetched on startup.');
    } catch (error) {
        console.error('Failed to fetch access token on startup:', error.message);
    }
})();

// Serve static files if they exist
if (fs.existsSync(path.join(__dirname, 'dist'))) {
    app.use(express.static(path.join(__dirname, 'dist'), {
        setHeaders: (res, path) => {
            res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
    }));
} else {
    console.warn('Dist directory not found. Run `npm run build` to generate the frontend build.');
}

// Catch-all route for SPA
app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('Frontend build not found. Please build the project.');
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});