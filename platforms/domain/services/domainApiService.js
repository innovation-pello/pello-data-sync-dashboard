import axios from 'axios';
import logger from '../../shared/services/logger.js';

/**
 * Fetch Domain property listings from the API.
 * @returns {Promise<object>} Property listings data.
 */
export async function fetchDomainData() {
    const endpoint = `${process.env.DOMAIN_API_BASE_URL}/listings`;
    try {
        const response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${process.env.DOMAIN_API_KEY}` },
        });
        return response.data;
    } catch (error) {
        logger.error(`Error fetching Domain listings: ${error.message}`);
        throw error;
    }
}

/**
 * Fetch performance data for a specific listing.
 * @param {string} listingId - The ID of the listing.
 * @returns {Promise<object>} Performance data.
 */
export async function fetchDomainPerformanceData(listingId) {
    const endpoint = `${process.env.DOMAIN_API_BASE_URL}/listings/${listingId}/performance`;
    try {
        const response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${process.env.DOMAIN_API_KEY}` },
        });
        return response.data;
    } catch (error) {
        logger.error(`Error fetching performance data for listing ${listingId}: ${error.message}`);
        throw error;
    }
}