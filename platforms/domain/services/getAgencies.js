import axios from 'axios';
import { logErrorMessage, logSyncMessage } from '../../shared/services/logger.js'; // Use shared logger

/**
 * Fetch agency data from Domain API.
 * @returns {Promise<object>} - Agency data.
 */
export async function getAgencies() {
    const apiUrl = `${process.env.DOMAIN_API_BASE_URL}/agencies`;
    const accessToken = process.env.DOMAIN_API_KEY;

    if (!apiUrl || !accessToken) {
        const errorMsg = 'Domain API URL or API Key is missing. Please check your environment variables.';
        logErrorMessage(errorMsg);
        throw new Error(errorMsg);
    }

    try {
        logSyncMessage('Fetching agency data from Domain API...');
        
        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        logSyncMessage('Successfully fetched agency data from Domain API.');
        return response.data;
    } catch (error) {
        handleApiError(error, 'Failed to fetch agency data from Domain API');
    }
}

/**
 * Handle errors from Domain API requests.
 * @param {Error} error - Axios error object.
 * @param {string} message - Custom error message for context.
 */
function handleApiError(error, message) {
    if (error.response) {
        const errorMsg = `${message}: ${JSON.stringify(error.response.data, null, 2)}`;
        logErrorMessage(errorMsg);
        throw new Error(errorMsg);
    } else if (error.request) {
        const errorMsg = `${message}: No response received from the Domain API.`;
        logErrorMessage(errorMsg);
        throw new Error(errorMsg);
    } else {
        const errorMsg = `${message}: ${error.message}`;
        logErrorMessage(errorMsg);
        throw new Error(errorMsg);
    }
}