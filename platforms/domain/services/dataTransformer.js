/**
 * Process a single Domain listing and transform it into Airtable record format.
 * @param {object} listing - API data for the listing.
 * @param {object} performanceData - Performance metrics for the listing.
 * @returns {object|null} - Transformed Airtable record or null if performance data is missing.
 */
export function processSingleListing(listing, performanceData) {
    if (!listing) {
        console.warn('No listing data available to process.');
        return null;
    }

    const listingId = String(listing.listingId).trim();
    console.log(`Processing ListingID: ${listingId}`);

    if (!performanceData || performanceData.listingId !== listingId) {
        console.warn(`No matching performance data found for ListingID: ${listingId}`);
        return null;
    }

    const transformedRecord = {
        UniqueID: listing.uniqueID || '',
        ListingID: listing.listingId || '',
        Address: `${listing.address || ''}`.trim(),
        Price: parseFloat(listing.price || 0),
        Bedrooms: listing.bedrooms || '0',
        Bathrooms: listing.bathrooms || '0',
        Status: listing.status || 'unknown',
        ...performanceData.metrics, // Include performance metrics
    };

    console.log(`Transformed record for ListingID: ${listingId}`, transformedRecord);

    return { fields: transformedRecord };
}

/**
 * Transform multiple Domain listings into Airtable-ready records.
 * @param {object} apiData - API data for multiple listings.
 * @param {object} performanceDataMap - A map of listing IDs to their performance data.
 * @returns {Array<object>} - Array of transformed records.
 */
export async function transformDataForAirtable(apiData, performanceDataMap) {
    const listings = Array.isArray(apiData.listings) ? apiData.listings : [apiData.listings].filter(Boolean);

    if (!listings || listings.length === 0) {
        console.warn('No listings found in API data.');
        return [];
    }

    const transformedRecords = listings.map(listing => {
        const performanceData = performanceDataMap[listing.listingId];
        return processSingleListing(listing, performanceData);
    }).filter(record => record !== null);

    console.log(`Transformed ${transformedRecords.length} records for Airtable.`);
    return transformedRecords;
}