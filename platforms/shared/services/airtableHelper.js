import Airtable from 'airtable';
import logger from './logger.js'; // Shared logger

// Initialize Airtable Base
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

/**
 * Fetch available options for single-select fields in Airtable.
 * Platform-specific logic to handle different tables.
 * @param {string} platform - Platform name (e.g., "domain", "realestate").
 * @returns {Promise<object>} Available options for platform-specific fields.
 */
export async function fetchAvailableOptions(platform) {
    let table;
    let fieldsToFetch;

    if (platform === 'domain') {
        table = base('Domain Listings API copy');
        fieldsToFetch = ['MOS', 'Listing Type', 'Office'];
    } else if (platform === 'realestate') {
        table = base('Realestate Listings API');
        fieldsToFetch = ['Property Type', 'Region', 'Agency'];
    } else {
        throw new Error(`Unsupported platform: ${platform}`);
    }

    try {
        const records = await table.select({}).firstPage();

        // Extract unique options for the specified fields
        const options = {};
        fieldsToFetch.forEach(field => {
            options[field] = [...new Set(records.map(record => record.get(field)))].filter(Boolean);
        });

        return options;
    } catch (error) {
        logger.error(`Error fetching available options for ${platform}: ${error.message}`);
        throw new Error(`Failed to fetch available options for ${platform}.`);
    }
}

/**
 * Create a record in Airtable for a specific platform.
 * @param {string} platform - Platform name (e.g., "domain", "realestate").
 * @param {object} fields - Fields for the new record.
 */
export async function createAirtableRecord(platform, fields) {
    let table;

    if (platform === 'domain') {
        table = base('Domain Listings API v2');
    } else if (platform === 'realestate') {
        table = base('Realestate Listings API v2');
    } else {
        throw new Error(`Unsupported platform: ${platform}`);
    }

    try {
        await table.create([{ fields }]);
        logger.info(`Record created successfully in ${platform}:`, fields);
    } catch (error) {
        logger.error(`Error creating record in ${platform}: ${error.response?.data || error.message}`);
        throw new Error(`Failed to create record in ${platform}.`);
    }
}