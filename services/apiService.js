const axios = require('axios');
const xml2js = require('xml2js');
const { fetchToken } = require('./tokenService'); // Token service
const { transformDataForAirtable } = require('./dataTransformer'); // Data transformer
const { pushDataToAirtable } = require('./airtableService'); // Airtable integration

// Utility function to parse XML data to JSON
const parseXML = (xml) => {
    return new Promise((resolve, reject) => {
        xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
            if (err) reject(new Error(`XML Parsing Error: ${err.message}`));
            else resolve(result);
        });
    });
};

// Fetch property data from the REA API
async function fetchDataFromAPI() {
    try {
        const accessToken = await fetchToken();
        console.log('Fetching property data from REA API...');

        const response = await axios.get(process.env.EXTERNAL_API_URL, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/xml',
            },
            responseType: 'text',
        });

        const jsonData = await parseXML(response.data);
        console.log('Property data successfully fetched and parsed.', { totalProperties: jsonData.propertyList.residential.length });
        return jsonData;
    } catch (error) {
        console.error('Error fetching property data:', error.message);
        throw new Error('Failed to fetch data from REA API.');
    }
}

// Fetch performance data for a specific listing ID
async function fetchListingPerformanceData(listingId) {
    try {
        const accessToken = await fetchToken();
        console.log(`Fetching performance data for Listing ID: ${listingId}...`);

        const url = `${process.env.LISTING_PERFORMANCE_API_URL}${listingId}`;
        console.log(`Requesting Performance Data from URL: ${url}`);

        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
            },
        });

        console.log(`Performance data fetched for Listing ID: ${listingId}`, response.data);
        return response.data;
    } catch (error) {
        console.error(`Error fetching performance data for Listing ID ${listingId}:`, error.message);

        if (error.response) {
            console.error('Error Response Data:', JSON.stringify(error.response.data, null, 2));
        }

        return null; // Return null if no data is found
    }
}

// Process only one listing for testing purposes
async function syncSingleListingToAirtable() {
    try {
        console.log('Starting sync process for a single listing...');
        const apiData = await fetchDataFromAPI(); // Fetch property data

        if (!apiData?.propertyList?.residential) {
            throw new Error('No residential property data found.');
        }

        const properties = Array.isArray(apiData.propertyList.residential)
            ? apiData.propertyList.residential
            : [apiData.propertyList.residential];

        const property = properties[0]; // Process only the first listing
        const listingId = String(property.listingId).trim();

        console.log(`Processing Listing ID: ${listingId}...`);
        const performanceData = await fetchListingPerformanceData(listingId);

        if (!performanceData) {
            console.warn(`No performance data fetched for Listing ID: ${listingId}`);
            return;
        }

        const transformedRecords = await transformDataForAirtable(
            { propertyList: { residential: [property] } },
            performanceData
        );

        if (transformedRecords.length > 0) {
            console.log(`Pushing transformed data for Listing ID: ${listingId}`);
            await pushDataToAirtable(transformedRecords);
            console.log(`Successfully synced Listing ID: ${listingId}`);
        } else {
            console.warn(`No valid records to push for Listing ID: ${listingId}`);
        }

        console.log('Single listing sync complete.');
    } catch (error) {
        console.error('Error during sync process for single listing:', error.message);
        throw new Error('Sync to Airtable failed for single listing.');
    }
}

module.exports = {
    fetchDataFromAPI,
    fetchListingPerformanceData,
    syncSingleListingToAirtable,
};