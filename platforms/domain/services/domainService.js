import axios from 'axios';
import { logErrorMessage, logSyncMessage } from '../../shared/services/logger.js'; // Shared logger for error and sync logging

// Load environment variables
const DOMAIN_API_BASE_URL = process.env.DOMAIN_API_BASE_URL;
const DOMAIN_API_KEY = process.env.DOMAIN_API_KEY;

/**
 * Verify if DOMAIN_API_KEY is set.
 * Throws an error if not configured.
 */
function verifyDomainApiKey() {
    if (!DOMAIN_API_KEY) {
        const errorMsg = 'DOMAIN_API_KEY is missing. Please authenticate with Domain.';
        logErrorMessage(errorMsg);
        throw new Error('Missing DOMAIN_API_KEY. Ensure the application is authorized.');
    }
}

/**
 * Fetch property data from Domain API.
 * @returns {Promise<object>} Property data from Domain.
 */
export async function fetchDomainData() {
    verifyDomainApiKey(); // Ensure API key is present

    try {
        logSyncMessage('Fetching property data from Domain API...');
        const response = await axios.get(`${DOMAIN_API_BASE_URL}/listings`, {
            headers: { Authorization: DOMAIN_API_KEY },
        });
        logSyncMessage('Successfully fetched property data from Domain API.');
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
    verifyDomainApiKey(); // Ensure API key is present

    try {
        logSyncMessage(`Fetching performance data for Listing ID: ${listingId}`);
        const response = await axios.get(`${DOMAIN_API_BASE_URL}/listings/${listingId}/performance`, {
            headers: { Authorization: DOMAIN_API_KEY },
        });
        logSyncMessage(`Successfully fetched performance data for Listing ID: ${listingId}`);
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
        // Server responded with a status code outside the 2xx range
        const errorMsg = `${message}: ${error.response.data?.error_description || error.response.statusText}`;
        logErrorMessage(errorMsg);
        throw new Error(errorMsg);
    } else if (error.request) {
        // No response received from the server
        const errorMsg = `${message}: No response received from the Domain API.`;
        logErrorMessage(errorMsg);
        throw new Error(errorMsg);
    } else {
        // Something went wrong while setting up the request
        const errorMsg = `${message}: ${error.message}`;
        logErrorMessage(errorMsg);
        throw new Error(errorMsg);
    }
}

export default {
    fetchDomainData,
    fetchDomainPerformanceData,
};