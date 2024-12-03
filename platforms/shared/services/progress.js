// /platforms/shared/services/progress.js

let clients = [];

/**
 * Send progress updates to all connected SSE clients.
 * @param {object} progress - Progress update object.
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

export { sendProgressUpdate, clients };