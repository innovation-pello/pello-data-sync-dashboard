import axios from 'axios';
import { logErrorMessage } from '../../shared/services/logger.js'; // Use shared logger

/**
 * Fetch agency data from Domain API.
 * @returns {Promise<object>} - Agency data.
 */
export async function getAgencies() {
    const apiUrl = `${process.env.DOMAIN_API_BASE_URL}/agencies`;
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
            logErrorMessage(`Error fetching agencies: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
            logErrorMessage(`Error fetching agencies: ${error.message}`);
        }
        throw new Error('Failed to fetch agencies.');
    }
}