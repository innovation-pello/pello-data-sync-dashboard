import axios from 'axios';
import { logErrorMessage } from '../../shared/services/logger.js'; // Use shared logger

/**
 * Fetch listings data from Domain API.
 * @returns {Promise<object>} - Listings data.
 */
export async function getListings() {
    const apiUrl = `${process.env.DOMAIN_API_BASE_URL}/listings`;
    const accessToken = process.env.DOMAIN_API_KEY;

    try {
        const response = await axios.get(apiUrl, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        return response.data;
    } catch (error) {
        if (error.response) {
            logErrorMessage(`Error fetching listings: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
            logErrorMessage(`Error fetching listings: ${error.message}`);
        }
        throw new Error('Failed to fetch listings.');
    }
}