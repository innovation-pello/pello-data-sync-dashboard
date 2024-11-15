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
        new winston.transports.Console({ level: 'warn' }), // Show only warnings and errors in the console
        new winston.transports.File({ filename: path.join(logDir, 'sync-logs.log'), level: 'info' }), // Detailed sync logs
        new winston.transports.File({ filename: path.join(logDir, 'error-logs.log'), level: 'error' }) // Errors only
    ],
});

/**
 * Logs sync messages with timestamps.
 * @param {string} message - The sync message.
 */
export function logSyncMessage(message) {
    logger.info(message);
}

/**
 * Logs warnings.
 * @param {string} message - The warning message.
 */
export function logWarningMessage(message) {
    logger.warn(message);
}

/**
 * Logs errors.
 * @param {string} message - The error message.
 */
export function logErrorMessage(message) {
    logger.error(message);
}

/**
 * Retrieves the last sync timestamp for a specific platform from the logs.
 * @param {string} platform - The platform name.
 * @returns {string} Last sync timestamp or 'N/A' if not found.
 */
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