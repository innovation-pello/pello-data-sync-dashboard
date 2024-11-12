// Load environment variables
require('dotenv').config();

// Import necessary modules
const axios = require('axios');
const fs = require('fs');
const crypto = require('crypto');

// Generate a nonce value for OAuth flow
function generateNonce() {
    const charset = '0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._~';
    return Array.from(crypto.randomBytes(32)).map(c => charset[c % charset.length]).join('');
}

// Store tokens in the .env file
function storeTokens(accessToken, refreshToken) {
    const domainApiKey = `Bearer ${accessToken}`; // Prepare DOMAIN_API_KEY format

    // Read current .env content
    let envContent = fs.readFileSync('.env', 'utf8');

    // Update ACCESS_TOKEN and REFRESH_TOKEN
    envContent = envContent.replace(/ACCESS_TOKEN=.*/g, `ACCESS_TOKEN=${accessToken}`);
    envContent = envContent.replace(/REFRESH_TOKEN=.*/g, `REFRESH_TOKEN=${refreshToken}`);

    // Update or add DOMAIN_API_KEY
    if (envContent.includes('DOMAIN_API_KEY')) {
        envContent = envContent.replace(/DOMAIN_API_KEY=.*/g, `DOMAIN_API_KEY=${domainApiKey}`);
    } else {
        envContent += `\nDOMAIN_API_KEY=${domainApiKey}`;
    }

    // Write updated tokens back to .env
    fs.writeFileSync('.env', envContent);

    // Reload environment variables to use updated tokens
    require('dotenv').config();
}

// Exchange authorization code for tokens
async function exchangeCodeForToken(code) {
    try {
        // Post request to exchange authorization code
        const tokenResponse = await axios.post(
            'https://auth.domain.com.au/v1/connect/token',
            new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.DOMAIN_REDIRECT_URI
            }),
            {
                auth: {
                    username: process.env.DOMAIN_CLIENT_ID,
                    password: process.env.DOMAIN_CLIENT_SECRET
                },
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        // Destructure tokens from response
        const { access_token, refresh_token } = tokenResponse.data;

        // Store tokens in .env file
        storeTokens(access_token, refresh_token);

        // Return tokens
        return { access_token, refresh_token };
    } catch (error) {
        console.error('Error exchanging code for token:', error.response?.data || error.message);
        throw error;
    }
}

//Construct the OAuth authorization URL
function getAuthUrl() {
    const nonce = generateNonce(); // Generate nonce
    const state = generateNonce(); // Generate state

    // Return the constructed OAuth URL
    return `https://auth.domain.com.au/v1/connect/authorize?client_id=${process.env.DOMAIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.DOMAIN_REDIRECT_URI)}&response_type=code&scope=openid%20profile%20api_listings_read%20api_agencies_read&nonce=${nonce}&state=${state}`;
}

// function getAuthUrl() {
//     const nonce = generateNonce();
//     const state = generateNonce();

//     return `https://auth.domain.com.au/v1/connect/authorize?client_id=${process.env.DOMAIN_REDIRECT_URI}&redirect_uri=${encodeURIComponent(process.env.DOMAIN_REDIRECT_URI)}&response_type=code&scope=openid%20profile%20api_listings_read%20api_agencies_read&nonce=${nonce}&state=${state}`;
// }

// Export functions for external use
module.exports = {
    getAuthUrl,
    exchangeCodeForToken
};