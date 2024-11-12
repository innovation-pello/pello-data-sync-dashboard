const fs = require('fs');
const path = require('path');

/**
 * Logs sync message with timestamp to sync-logs.txt
 * Ensures the message follows the correct format.
 * @param {string} message
 */
function logSyncMessage(message) {
    const timestamp = new Date().toLocaleString();
    const formattedMessage = `[${timestamp}] ${message.trim()}\n`;

    const logsFilePath = path.join(__dirname, '../logs', 'sync-logs.txt');

    try {
        if (!fs.existsSync(path.dirname(logsFilePath))) {
            fs.mkdirSync(path.dirname(logsFilePath));
        }

        // Ensure correct format before logging
        if (!isValidLogFormat(formattedMessage)) {
            console.warn(`Invalid log format detected: ${formattedMessage}`);
            return;
        }

        fs.appendFileSync(logsFilePath, formattedMessage);
    } catch (error) {
        console.error('Failed to write log:', error.message);
    }
}

/**
 * Validates the log format.
 * Expected format:
 * [timestamp] Platform — Sync completed. Success: X, Failed: Y
 * or
 * [timestamp] Platform — Custom Message
 * @param {string} log
 * @returns {boolean} Whether the log format is valid.
 */
function isValidLogFormat(log) {
    const logFormatRegex = /^\[\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} (AM|PM)\] [A-Za-z. ]+ — (Sync completed\. Success: \d+, Failed: \d+|.+)\n$/;
    return logFormatRegex.test(log);
}

/**
 * Retrieves the last sync timestamp for a specific platform from the logs.
 * @param {string} platform
 * @returns {string} Last sync timestamp or 'N/A' if not found.
 */
function getLastSyncTimestamp(platform) {
    const logsFilePath = path.join(__dirname, '../logs', 'sync-logs.txt');

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
        console.error('Failed to read log file:', error.message);
    }

    return 'N/A';
}

module.exports = { logSyncMessage, getLastSyncTimestamp };