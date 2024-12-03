import axios from 'axios';
import logger from '../../shared/services/logger.js';

/**
 * Validate required environment variables for Domain API.
 */
function validateDomainEnvVars() {
    const requiredVars = ['DOMAIN_API_BASE_URL', 'DOMAIN_API_KEY'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
        const errorMsg = `Missing required environment variables: ${missingVars.join(', ')}`;
        logger.error(errorMsg);
        throw new Error(errorMsg);
    }
}

/**
 * Fetch Domain property listings from the API.
 * @returns {Promise<object>} Property listings data.
 */
export async function fetchDomainData() {
    validateDomainEnvVars(); // Ensure environment variables are set

    const endpoint = `${process.env.DOMAIN_API_BASE_URL}/listings`;
    logger.info(`Fetching Domain property listings from ${endpoint}...`);

    try {
        const response = await axios.get(endpoint, {
            headers: {
                Authorization: `Bearer ${process.env.DOMAIN_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        logger.info(`Fetched ${response.data.listings?.length || 0} listings from Domain API.`);
        return response.data;
    } catch (error) {
        if (error.response) {
            logger.error(
                `Error fetching Domain listings: ${error.response.status} ${error.response.statusText}`
            );
            logger.error(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
            logger.error(`Error fetching Domain listings: ${error.message}`);
        }
        throw new Error('Failed to fetch Domain property listings.');
    }
}

/**
 * Fetch performance data for a specific listing.
 * @param {string} listingId - The ID of the listing.
 * @returns {Promise<object>} Performance data.
 */
export async function fetchDomainPerformanceData(listingId) {
    validateDomainEnvVars(); // Ensure environment variables are set

    const endpoint = `${process.env.DOMAIN_API_BASE_URL}/listings/${listingId}/performance`;
    logger.info(`Fetching performance data for Listing ID: ${listingId} from ${endpoint}...`);

    try {
        const response = await axios.get(endpoint, {
            headers: {
                Authorization: `Bearer ${process.env.DOMAIN_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        logger.info(`Fetched performance data for Listing ID: ${listingId}.`);
        return response.data;
    } catch (error) {
        if (error.response) {
            logger.error(
                `Error fetching performance data for Listing ID ${listingId}: ${error.response.status} ${error.response.statusText}`
            );
            logger.error(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
        } else {
            logger.error(`Error fetching performance data for Listing ID ${listingId}: ${error.message}`);
        }
        throw new Error(`Failed to fetch performance data for Listing ID ${listingId}.`);
    }
}