// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Import necessary modules
import axios from 'axios';
import fs from 'fs';

// In-memory storage for tokens
let memoryTokens = {
    accessToken: process.env.DOMAIN_ACCESS_TOKEN || '',
};

/**
 * Updates a specific environment variable in the .env content.
 * @param {string} envContent - Current .env content.
 * @param {string} key - Environment variable key.
 * @param {string} value - Environment variable value.
 * @returns {string} Updated .env content.
 */
function updateEnvVariable(envContent, key, value) {
    const regex = new RegExp(`${key}=.*`, 'g');
    const newLine = `${key}=${value}`;
    return regex.test(envContent) ? envContent.replace(regex, newLine) : `${envContent}\n${newLine}`;
}

/**
 * Store tokens in memory and .env, and generate DOMAIN_API_KEY.
 * @param {string} accessToken - Access token.
 */
function storeTokens(accessToken) {
    if (!accessToken) {
        throw new Error('Invalid token: Access token is required.');
    }

    memoryTokens.accessToken = accessToken;

    const domainApiKey = `Bearer ${accessToken}`; // Generate DOMAIN_API_KEY
    console.log('Storing token and generating DOMAIN_API_KEY...');

    try {
        let envContent = '';
        try {
            envContent = fs.readFileSync('.env', 'utf8');
        } catch (error) {
            console.warn('.env file not found. Creating a new one.');
        }

        envContent = updateEnvVariable(envContent, 'DOMAIN_ACCESS_TOKEN', accessToken);
        envContent = updateEnvVariable(envContent, 'DOMAIN_API_KEY', domainApiKey);

        fs.writeFileSync('.env', envContent);
        dotenv.config(); // Reload environment variables
        console.log('Access token and DOMAIN_API_KEY successfully stored in .env file.');
    } catch (error) {
        console.error('Failed to store token:', error.message);
        throw new Error('Error storing token.');
    }
}

/**
 * Fetch access token using client credentials.
 * @returns {Promise<string>} Access token.
 */
async function fetchAccessToken() {
    const tokenEndpoint = 'https://auth.domain.com.au/v1/connect/token';

    try {
        console.log('Requesting access token using client credentials...');

        // Encode client ID and secret to Base64
        const credentials = Buffer.from(
            `${process.env.DOMAIN_CLIENT_ID}:${process.env.DOMAIN_CLIENT_SECRET}`
        ).toString('base64');

        const response = await axios.post(
            tokenEndpoint,
            new URLSearchParams({
                grant_type: 'client_credentials',
            }),
            {
                headers: {
                    Authorization: `Basic ${credentials}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );

        const { access_token } = response.data;

        if (!access_token) {
            throw new Error('Failed to obtain access token.');
        }

        storeTokens(access_token); // Store token and generate DOMAIN_API_KEY
        return access_token;
    } catch (error) {
        console.error('Error fetching access token:', error.response?.data || error.message);
        throw new Error(`Access token request failed: ${error.response?.data?.error_description || error.message}`);
    }
}

/**
 * Load tokens on server startup or page reload.
 */
async function loadTokensOnStartup() {
    try {
        console.log('Fetching fresh tokens on startup...');
        await fetchAccessToken(); // Fetch and store fresh tokens on every startup or reload
        console.log('Tokens refreshed and stored successfully on startup.');
    } catch (error) {
        console.error('Failed to refresh tokens on startup:', error.message);
    }
}

/**
 * Validate the current access token.
 * @returns {boolean} True if the token exists and is non-empty.
 */
function validateAccessToken() {
    return !!memoryTokens.accessToken;
}

// Export functions for external use
export { fetchAccessToken, validateAccessToken, loadTokensOnStartup, memoryTokens };