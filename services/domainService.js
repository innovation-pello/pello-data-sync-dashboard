const axios = require('axios');

// Load environment variables
const DOMAIN_API_BASE_URL = process.env.DOMAIN_API_BASE_URL;
const DOMAIN_API_KEY = process.env.DOMAIN_API_KEY;

/**
 * Fetch data from Domain API.
 * @returns {Promise<object>} Property data from Domain.
 */
async function fetchDomainData() {
    try {
        const response = await axios.get(`${DOMAIN_API_BASE_URL}/listings`, {
            headers: { Authorization: DOMAIN_API_KEY }
        });
        return response.data;
    } catch (error) {
        console.error('Failed to fetch data from Domain API:', error.message);
        throw new Error('Domain API data fetch failed.');
    }
}

/**
 * Fetch performance data for a specific listing.
 * @param {string} listingId
 * @returns {Promise<object>} Performance data for the listing.
 */
async function fetchDomainPerformanceData(listingId) {
    try {
        const response = await axios.get(`${DOMAIN_API_BASE_URL}/listings/${listingId}/performance`, {
            headers: { Authorization: DOMAIN_API_KEY }
        });
        return response.data;
    } catch (error) {
        console.error(`Failed to fetch performance data for listing ${listingId}:`, error.message);
        throw new Error('Domain API performance data fetch failed.');
    }
}

module.exports = { fetchDomainData, fetchDomainPerformanceData };