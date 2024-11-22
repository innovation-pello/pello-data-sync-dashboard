import axios from 'axios';

/**
 * Fetch access token for Facebook & Instagram.
 * @returns {Promise<string>} Access token.
 */
export async function fetchAccessToken() {
    const tokenEndpoint = 'https://graph.facebook.com/oauth/access_token';
    
    try {
        const response = await axios.post(tokenEndpoint, {
            client_id: process.env.FB_CLIENT_ID,
            client_secret: process.env.FB_CLIENT_SECRET,
            grant_type: 'client_credentials'
        });

        return response.data.access_token;
    } catch (error) {
        console.error('Failed to fetch access token:', error.response?.data || error.message);
        throw new Error('Failed to authenticate Facebook API.');
    }
}