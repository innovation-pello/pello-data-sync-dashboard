import axios from 'axios';
import qs from 'querystring';
import { logSyncMessage, logErrorMessage } from '../../shared/services/logger.js'; // Shared logger

/**
 * Validate Realestate API credentials in environment variables.
 */
function validateEnvVariables() {
    const requiredVars = [
        'REALESTATE_AUTH_ENDPOINT',
        'REALESTATE_CLIENT_ID',
        'REALESTATE_CLIENT_SECRET',
    ];
    requiredVars.forEach(variable => {
        if (!process.env[variable]) {
            throw new Error(`Missing required environment variable: ${variable}`);
        }
    });
}

/**
 * Fetch OAuth token for Realestate platform.
 * @returns {Promise<string>} Access token.
 */
export async function fetchRealestateToken() {
    validateEnvVariables();

    const authEndpoint = process.env.REALESTATE_AUTH_ENDPOINT;
    const clientId = process.env.REALESTATE_CLIENT_ID;
    const clientSecret = process.env.REALESTATE_CLIENT_SECRET;

    try {
        logSyncMessage('Fetching access token for Realestate platform...');

        const basicAuthHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const response = await axios.post(
            authEndpoint,
            qs.stringify({
                grant_type: 'client_credentials',
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Basic ${basicAuthHeader}`,
                },
            }
        );

        const accessToken = response.data.access_token;
        if (!accessToken) {
            throw new Error('No access token returned from Realestate API.');
        }

        logSyncMessage('Successfully fetched access token for Realestate platform.');
        return accessToken;
    } catch (error) {
        const errorMsg = `Failed to fetch Realestate access token: ${error.response?.data?.error_description || error.message}`;
        logErrorMessage(errorMsg);

        // Log detailed response if available
        if (error.response) {
            logErrorMessage(`Error Response: ${JSON.stringify(error.response.data, null, 2)}`);
        }

        throw new Error(errorMsg);
    }
}