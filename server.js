// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Import required modules
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getLastSyncTimestamp } from './services/logger.js';
import { exchangeCodeForToken } from './services/auth.js';

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

// Function to send progress updates to SSE clients
function sendProgressUpdate(progress) {
    clients.forEach(client => {
        client.write(`data: ${JSON.stringify(progress)}\n\n`);
    });
}
export { clients, sendProgressUpdate };

// Use platform-specific routes
import realestateRoutes from './routes/realestate.js';
import domainRoutes from './routes/domain.js';
import domainAuthRoutes from './routes/domainAuth.js';

app.use('/api/realestate', realestateRoutes);
app.use('/api/domain', domainRoutes);
app.use('/api/domain/auth', domainAuthRoutes);

// Platform Status Route
app.get('/api/status', (req, res) => {
    const platforms = [
        { platform: 'Realestate.com.au', status: 'Connected', lastSync: 'N/A' },
        { platform: 'Domain.com.au', status: 'Connected', lastSync: 'N/A' }
    ];

    platforms.forEach(platform => {
        platform.lastSync = getLastSyncTimestamp(platform.platform);
    });

    res.json(platforms);
});

// Logs Route
app.get('/api/logs', (req, res) => {
    const logsFilePath = path.join(__dirname, 'logs', 'sync-logs.txt');

    fs.readFile(logsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Failed to read logs:', err.message);
            res.status(500).json({ error: 'Failed to retrieve logs' });
        } else {
            const logs = data.trim().split('\n');
            res.json(Array.from(new Set(logs)));
        }
    });
});

// OAuth callback route
app.get('/oauth/callback', (req, res) => {
    const authorizationCode = req.query.code;
    const error = req.query.error;

    if (error) {
        console.error('OAuth authorization error:', error);
        return res.status(400).send('Authorization failed.');
    }

    if (!authorizationCode) {
        console.error('Authorization code not found.');
        return res.status(400).send('Authorization code missing.');
    }

    exchangeCodeForToken(authorizationCode)
        .then(() => {
            res.redirect('/?authSuccess=domaincomau');
        })
        .catch(err => {
            console.error('Error exchanging code for token:', err.message);
            res.status(500).send('Failed to exchange authorization code.');
        });
});

// Serve frontend files
app.use(express.static(path.join(__dirname, 'dist')));

// Catch-all route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});