import axios from 'axios';

// Load environment variables
const DOMAIN_API_BASE_URL = process.env.DOMAIN_API_BASE_URL;
const DOMAIN_API_KEY = process.env.DOMAIN_API_KEY;

/**
 * Verify if DOMAIN_API_KEY is set.
 * Throws an error if not configured.
 */
function verifyDomainApiKey() {
    if (!DOMAIN_API_KEY) {
        console.error('DOMAIN_API_KEY is missing. Please authenticate with Domain.');
        throw new Error('Missing DOMAIN_API_KEY. Ensure the application is authorized.');
    }
}

/**
 * Fetch data from Domain API.
 * @returns {Promise<object>} Property data from Domain.
 */
export async function fetchDomainData() {
    verifyDomainApiKey(); // Ensure API key is present

    try {
        const response = await axios.get(`${DOMAIN_API_BASE_URL}/listings`, {
            headers: { Authorization: DOMAIN_API_KEY }
        });
        return response.data;
    } catch (error) {
        handleApiError(error, 'Failed to fetch data from Domain API');
    }
}

/**
 * Fetch performance data for a specific listing.
 * @param {string} listingId
 * @returns {Promise<object>} Performance data for the listing.
 */
export async function fetchDomainPerformanceData(listingId) {
    verifyDomainApiKey(); // Ensure API key is present

    try {
        const response = await axios.get(`${DOMAIN_API_BASE_URL}/listings/${listingId}/performance`, {
            headers: { Authorization: DOMAIN_API_KEY }
        });
        return response.data;
    } catch (error) {
        handleApiError(error, `Failed to fetch performance data for listing ${listingId}`);
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
        console.error(`${message}:`, error.response.data || error.response.statusText);
        throw new Error(`${message}: ${error.response.data?.error_description || error.response.statusText}`);
    } else if (error.request) {
        // No response received from the server
        console.error(`${message}: No response received from the Domain API.`);
        throw new Error(`${message}: No response received from the Domain API.`);
    } else {
        // Something went wrong while setting up the request
        console.error(`${message}:`, error.message);
        throw new Error(`${message}: ${error.message}`);
    }
}