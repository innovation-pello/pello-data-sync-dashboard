import axios from 'axios';
import qs from 'querystring';

/**
 * Fetch OAuth token from REA API.
 * @returns {Promise<string>} Access token.
 */
export async function fetchToken() {
    const authEndpoint = process.env.AUTH_ENDPOINT;
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;

    try {
        console.log('Fetching token from REA API...');
        const basicAuthHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const response = await axios.post(authEndpoint, qs.stringify({
            grant_type: 'client_credentials',
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${basicAuthHeader}`,
            },
        });

        console.log('Token fetched successfully:', response.data.access_token);
        return response.data.access_token;
    } catch (error) {
        console.error('Error fetching token:', error.response?.data || error.message);
        throw new Error('Failed to fetch access token.');
    }
}