import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Define log directory
const logDir = path.join(process.cwd(), 'logs');

// Ensure logs directory exists
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Create a Winston logger instance
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
        })
    ),
    transports: [
        new winston.transports.Console({ level: 'warn' }),
        new winston.transports.File({ filename: path.join(logDir, 'sync-logs.txt'), level: 'info' }), // Main log file
        new winston.transports.File({ filename: path.join(logDir, 'error-logs.txt'), level: 'error' }) // Error logs
    ],
});

// Array of connected SSE clients for real-time log streaming
const logClients = [];

/**
 * Broadcast a log message to all connected SSE clients.
 * @param {string} level - Log level (info, warn, error).
 * @param {string} message - Log message.
 */
function broadcastLog(level, message) {
    const logEntry = `[${new Date().toISOString()}] ${level.toUpperCase()}: ${message}`;
    logClients.forEach(client => client.write(`data: ${logEntry}\n\n`));
}

/**
 * Add a new SSE client for log streaming.
 * @param {object} res - SSE response stream.
 */
export function addLogClient(res) {
    logClients.push(res);
    res.on('close', () => {
        logClients.splice(logClients.indexOf(res), 1);
        console.log(`Client disconnected: ${logClients.length} active log clients`);
    });
}

// Logging functions that also broadcast logs
export function logSyncMessage(message) {
    logger.info(message);
    fs.appendFileSync(path.join(logDir, 'sync-logs.txt'), `[${new Date().toLocaleString()}] ${message}\n`);
    broadcastLog('info', message);
}

export function logWarningMessage(message) {
    logger.warn(message);
    broadcastLog('warn', message);
}

export function logErrorMessage(message) {
    logger.error(message);
    broadcastLog('error', message);
}

export function getLastSyncTimestamp(platform) {
    const logsFilePath = path.join(logDir, 'sync-logs.log');

    try {
        if (fs.existsSync(logsFilePath)) {
            const logs = fs.readFileSync(logsFilePath, 'utf-8')
                .split('\n')
                .filter(log => log.includes(`${platform} — Sync completed`));

            if (logs.length > 0) {
                const lastLog = logs[logs.length - 1];
                const match = lastLog.match(/\[(.*?)\]/);
                return match ? match[1] : 'N/A';
            }
        }
    } catch (error) {
        logger.error(`Failed to read log file: ${error.message}`);
    }

    return 'N/A';
}

export default logger;