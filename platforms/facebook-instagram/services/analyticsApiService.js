import axios from 'axios';
import { fetchAccessToken } from './authService.js';

/**
 * Fetch analytics data from Facebook & Instagram API.
 * @returns {Promise<object>} Analytics data.
 */
export async function fetchAnalyticsData() {
    const accessToken = await fetchAccessToken();
    const endpoint = `https://graph.facebook.com/v15.0/me/insights`;

    try {
        const response = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching analytics data:', error.response?.data || error.message);
        throw new Error('Failed to fetch analytics data.');
    }
}