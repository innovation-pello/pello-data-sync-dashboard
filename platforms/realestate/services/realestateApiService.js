import axios from 'axios';
import xml2js from 'xml2js';
import { fetchRealestateToken } from './realestateAuthService.js'; // Platform-specific auth service
import { transformDataForAirtable } from './dataTransformer.js'; // Platform-specific data transformer
import { pushDataToAirtable } from '../../shared/services/airtableService.js'; // Airtable integration
import { logSyncMessage, logErrorMessage } from '../../shared/services/logger.js'; // Shared logger

// Utility function to parse XML data to JSON
const parseXML = (xml) => {
    return new Promise((resolve, reject) => {
        xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
            if (err) reject(new Error(`XML Parsing Error: ${err.message}`));
            else resolve(result);
        });
    });
};

/**
 * Fetch property data from the Realestate API.
 * @returns {Promise<object>} Parsed property data.
 */
export async function fetchDataFromAPI() {
    try {
        const accessToken = await fetchRealestateToken(); // Use platform-specific token
        //logSyncMessage('Fetching property data from Realestate API...');

        const response = await axios.get(process.env.REALESTATE_API_URL, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/xml',
            },
            responseType: 'text',
        });

        const jsonData = await parseXML(response.data);
        //logSyncMessage(`Property data successfully fetched. Total Properties: ${jsonData.propertyList.residential.length}`);
        return jsonData;
    } catch (error) {
        logErrorMessage(`Error fetching property data: ${error.message}`);
        throw new Error('Failed to fetch data from Realestate API.');
    }
}

/**
 * Fetch performance data for a specific listing ID.
 * @param {string} listingId - The ID of the listing.
 * @returns {Promise<object|null>} Performance data or null if not found.
 */
export async function fetchListingPerformanceData(listingId) {
    try {
        const accessToken = await fetchRealestateToken(); // Use platform-specific token
        //logSyncMessage(`Fetching performance data for Listing ID: ${listingId}...`);

        const url = `${process.env.REALESTATE_PERFORMANCE_API_URL}${listingId}`;
        //logSyncMessage(`Requesting Performance Data from URL: ${url}`);

        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        return response.data;
    } catch (error) {
        logErrorMessage(`Error fetching performance data for Listing ID ${listingId}: ${error.message}`);
        if (error.response) {
            logErrorMessage(`Error Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
        }
        return null; // Return null if no data is found
    }
}

/**
 * Process and sync a single listing to Airtable (used for testing).
 * @returns {Promise<void>}
 */
export async function syncSingleListingToAirtable() {
    try {
        logSyncMessage('Starting sync process for a single listing...');
        const apiData = await fetchDataFromAPI();

        if (!apiData?.propertyList?.residential) {
            throw new Error('No residential property data found.');
        }

        const properties = Array.isArray(apiData.propertyList.residential)
            ? apiData.propertyList.residential
            : [apiData.propertyList.residential];

        const property = properties[0]; // Process the first listing
        const listingId = String(property.listingId).trim();

        logSyncMessage(`Processing Listing ID: ${listingId}...`);
        const performanceData = await fetchListingPerformanceData(listingId);

        if (!performanceData) {
            logErrorMessage(`No performance data fetched for Listing ID: ${listingId}`);
            return;
        }

        const transformedRecords = await transformDataForAirtable(
            { propertyList: { residential: [property] } },
            { [listingId]: performanceData }
        );

        if (transformedRecords.length > 0) {
            logSyncMessage(`Pushing transformed data for Listing ID: ${listingId}`);
            await pushDataToAirtable(transformedRecords);
            logSyncMessage(`Successfully synced Listing ID: ${listingId}`);
        } else {
            logErrorMessage(`No valid records to push for Listing ID: ${listingId}`);
        }

        logSyncMessage('Single listing sync complete.');
    } catch (error) {
        logErrorMessage(`Error during sync process for single listing: ${error.message}`);
        throw new Error('Sync to Airtable failed for single listing.');
    }
}