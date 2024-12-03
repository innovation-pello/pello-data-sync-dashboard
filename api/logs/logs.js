import express from 'express';
import fs from 'fs';
import path from 'path';

const router = express.Router();

// Define the log file path
const logsDir = path.join(process.cwd(), 'logs');
const logsFilePath = path.join(logsDir, 'sync-logs.txt');

// Route to fetch logs
router.get('/', (req, res) => {
    try {
        if (!fs.existsSync(logsFilePath)) {
            return res.status(200).json({ logs: [], message: 'Log file does not exist.' });
        }

        const logs = fs.readFileSync(logsFilePath, 'utf-8')
            .split('\n')
            .filter(log => log.trim() !== '') // Remove empty lines
            .map((log, index) => ({ id: index + 1, message: log.trim() })); // Add an ID for each log

        res.status(200).json({ logs, message: 'Logs retrieved successfully.' });
    } catch (error) {
        console.error('Failed to read logs:', error.message);
        res.status(500).json({ error: 'Failed to retrieve logs.', details: error.message });
    }
});

export default router;