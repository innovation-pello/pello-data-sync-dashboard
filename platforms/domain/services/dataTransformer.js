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

    const listingId = String(listing.listingId || '').trim();
    if (!listingId) {
        console.warn('Invalid or missing ListingID:', listing);
        return null;
    }

    console.log(`Processing ListingID: ${listingId}`);

    if (!performanceData || performanceData.listingId !== listingId) {
        console.warn(`No matching performance data found for ListingID: ${listingId}`);
        return null;
    }

    const transformedRecord = {
        UniqueID: listing.uniqueID || '',
        ListingID: listingId,
        Address: (listing.address || '').trim() || 'Unknown Address',
        Price: parseFloat(listing.price || 0),
        Bedrooms: parseInt(listing.bedrooms || '0', 10),
        Bathrooms: parseInt(listing.bathrooms || '0', 10),
        Status: listing.status || 'unknown',
        ...(performanceData.metrics || {}), // Include performance metrics if defined
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

    const transformedRecords = [];
    for (const listing of listings) {
        try {
            const listingId = String(listing?.listingId || '').trim();
            if (!listingId) {
                console.warn('Skipping listing due to missing ListingID:', listing);
                continue;
            }

            const performanceData = performanceDataMap[listingId];
            if (!performanceData) {
                console.warn(`Performance data not found for ListingID: ${listingId}`);
                continue;
            }

            const record = processSingleListing(listing, performanceData);
            if (record) {
                transformedRecords.push(record);
            } else {
                console.warn(`Skipping ListingID ${listingId} due to transformation issues.`);
            }
        } catch (error) {
            console.error(`Error processing ListingID ${listing?.listingId || 'unknown'}: ${error.message}`);
        }
    }

    console.log(`Transformed ${transformedRecords.length} records for Airtable.`);
    return transformedRecords;
}