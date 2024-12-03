import axios from 'axios';
import { logErrorMessage, logSyncMessage } from '../../shared/services/logger.js';

// Utility to validate environment variables
function validateEnvVars(requiredVars) {
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
        const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
        logErrorMessage(errorMsg);
        throw new Error(errorMsg);
    }
}

// Validate required environment variables
validateEnvVars(['DOMAIN_API_BASE_URL', 'DOMAIN_API_KEY']);

// Load environment variables
const DOMAIN_API_BASE_URL = process.env.DOMAIN_API_BASE_URL;
const DOMAIN_API_KEY = process.env.DOMAIN_API_KEY;

/**
 * Fetch property data from Domain API.
 * @returns {Promise<object>} Property data from Domain.
 */
export async function fetchDomainData() {
    const endpoint = `${DOMAIN_API_BASE_URL}/listings`;

    logSyncMessage('Fetching property data from Domain API...');
    try {
        const response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${DOMAIN_API_KEY}` },
        });

        logSyncMessage(`Fetched ${response.data?.listings?.length || 0} properties from Domain API.`);
        return response.data;
    } catch (error) {
        handleApiError(error, 'Failed to fetch property data from Domain API');
    }
}

/**
 * Fetch performance data for a specific listing.
 * @param {string} listingId - The listing ID to fetch performance data for.
 * @returns {Promise<object>} Performance data for the listing.
 */
export async function fetchDomainPerformanceData(listingId) {
    const endpoint = `${DOMAIN_API_BASE_URL}/listings/${listingId}/performance`;

    logSyncMessage(`Fetching performance data for Listing ID: ${listingId}`);
    try {
        const response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${DOMAIN_API_KEY}` },
        });

        logSyncMessage(`Fetched performance data for Listing ID: ${listingId}.`);
        return response.data;
    } catch (error) {
        handleApiError(error, `Failed to fetch performance data for Listing ID ${listingId}`);
    }
}

/**
 * Generic error handler for API requests.
 * @param {Error} error - Axios error object.
 * @param {string} message - Custom error message.
 */
function handleApiError(error, message) {
    if (error.response) {
        // API returned an error response
        const errorMsg = `${message}: Status ${error.response.status} - ${error.response.statusText}.`;
        logErrorMessage(errorMsg);
        logErrorMessage(`Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
        throw new Error(errorMsg);
    } else if (error.request) {
        // Request was made but no response received
        const errorMsg = `${message}: No response received from the Domain API.`;
        logErrorMessage(errorMsg);
        throw new Error(errorMsg);
    } else {
        // Error setting up the request
        const errorMsg = `${message}: ${error.message}`;
        logErrorMessage(errorMsg);
        throw new Error(errorMsg);
    }
}

export default {
    fetchDomainData,
    fetchDomainPerformanceData,
};