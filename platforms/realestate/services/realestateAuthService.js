import axios from 'axios';
import qs from 'querystring';

/**
 * Fetch OAuth token for Realestate platform.
 * @returns {Promise<string>} Access token.
 */
export async function fetchRealestateToken() {
    const authEndpoint = process.env.REALESTATE_AUTH_ENDPOINT;
    const clientId = process.env.REALESTATE_CLIENT_ID;
    const clientSecret = process.env.REALESTATE_CLIENT_SECRET;

    if (!authEndpoint || !clientId || !clientSecret) {
        throw new Error('Realestate API credentials are missing in environment variables.');
    }

    try {
        console.log('Fetching token for Realestate platform...');
        
        const basicAuthHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const response = await axios.post(authEndpoint, qs.stringify({
            grant_type: 'client_credentials',
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${basicAuthHeader}`,
            },
        });

        console.log('Token fetched successfully for Realestate:', response.data.access_token);
        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching token for Realestate:', error.response?.data || error.message);
        throw new Error('Failed to fetch Realestate access token.');
    }
}