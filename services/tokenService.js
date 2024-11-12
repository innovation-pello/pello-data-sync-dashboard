const axios = require('axios');
const qs = require('querystring');

// Fetch OAuth token from REA API
async function fetchToken() {
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

module.exports = { fetchToken };