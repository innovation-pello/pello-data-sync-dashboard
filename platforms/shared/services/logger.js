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
        new winston.transports.Console({ level: 'warn' }), // Only warn and above logs are shown in the console
        new winston.transports.File({ filename: path.join(logDir, 'sync-logs.txt'), level: 'info' }), // Info-level logs
        new winston.transports.File({ filename: path.join(logDir, 'error-logs.txt'), level: 'error' }) // Error-level logs
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
    logClients.forEach(client => {
        try {
            client.write(`data: ${logEntry}\n\n`);
        } catch (err) {
            logger.warn(`Failed to send log to SSE client: ${err.message}`);
        }
    });
}

/**
 * Add a new SSE client for log streaming.
 * @param {object} res - SSE response stream.
 */
export function addLogClient(res) {
    logClients.push(res);
    res.on('close', () => {
        logClients.splice(logClients.indexOf(res), 1);
        logger.info(`Client disconnected. Active log clients: ${logClients.length}`);
    });
}

/**
 * Write sync logs and broadcast the message.
 * @param {string} message - Log message.
 */
export function logSyncMessage(message) {
    const logEntry = `[${new Date().toLocaleString()}] ${message}`;
    logger.info(message);
    fs.appendFileSync(path.join(logDir, 'sync-logs.txt'), `${logEntry}\n`);
    broadcastLog('info', message);
}

/**
 * Log warnings and broadcast the message.
 * @param {string} message - Warning message.
 */
export function logWarningMessage(message) {
    logger.warn(message);
    broadcastLog('warn', message);
}

/**
 * Log errors and broadcast the message.
 * @param {string} message - Error message.
 */
export function logErrorMessage(message) {
    logger.error(message);
    broadcastLog('error', message);
}

/**
 * Retrieve the last sync timestamp for a specific platform from the logs.
 * @param {string} platform - The platform name.
 * @returns {string} Last sync timestamp or 'N/A' if not found.
 */
export function getLastSyncTimestamp(platform) {
    const logsFilePath = path.join(logDir, 'sync-logs.txt');

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
        logger.error(`Failed to read sync logs: ${error.message}`);
    }

    return 'N/A';
}

/**
 * Clear old logs from the directory (optional cleanup function).
 * @param {number} days - Number of days to retain logs.
 */
export function clearOldLogs(days = 30) {
    const now = Date.now();
    const retentionTime = days * 24 * 60 * 60 * 1000;

    try {
        fs.readdirSync(logDir).forEach(file => {
            const filePath = path.join(logDir, file);
            const stats = fs.statSync(filePath);

            if (now - stats.mtimeMs > retentionTime) {
                fs.unlinkSync(filePath);
                logger.info(`Deleted old log file: ${file}`);
            }
        });
    } catch (error) {
        logger.error(`Error clearing old logs: ${error.message}`);
    }
}

export default logger;