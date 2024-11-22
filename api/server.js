// api/server.js
import express from 'express';
import cors from 'cors';
import { getLastSyncTimestamp, logSyncMessage, addLogClient } from '../platforms/shared/services/logger.js';
import { fetchAccessToken, memoryTokens } from '../platforms/shared/services/auth.js';
import realestateRoutes from '../platforms/realestate/routes/realestate.js';
import domainRoutes from '../platforms/domain/routes/domain.js';

const app = express();
app.use(cors());
app.use(express.json());

// SSE clients
let clients = [];

// Helper to send progress updates
function sendProgressUpdate(progress) {
    clients.forEach(client => client.write(`data: ${JSON.stringify(progress)}\n\n`));
}

// Export SSE functionality
export { sendProgressUpdate, clients };

// API routes
app.use('/realestate', realestateRoutes);
app.use('/domain', domainRoutes);

// Logs and status routes
app.get('/logs', (req, res) => {
    // Logic for logs
    res.status(200).json(['Example log entry']);
});

app.get('/status', (req, res) => {
    res.status(200).json([
        { platform: 'Realestate.com.au', status: 'Connected', lastSync: getLastSyncTimestamp('Realestate.com.au') },
        { platform: 'Domain.com.au', status: memoryTokens.accessToken ? 'Connected' : 'Not Authorized', lastSync: getLastSyncTimestamp('Domain.com.au') },
    ]);
});

export default app;