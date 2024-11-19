import axios from 'axios';
import Airtable from 'airtable';
import { fetchListingStatistics } from './domainApiService.js'; // Import statistics fetching logic
import { logSyncMessage, logErrorMessage, logDebugMessage } from '../../shared/services/logger.js'; // Shared logger

// Initialize Airtable Base
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const tableName = process.env.AIRTABLE_DOMAIN_LISTINGS_TABLE || 'Domain Listings API'; // Use env variable for table name

// Agencies list
const agencies = [
    { name: "LNS", id: 2842 },
    { name: "UNS", id: 36084 },
    { name: "NS", id: 36082 },
];

/**
 * Find a record in Airtable by "Listing ID".
 * @param {string} listingId - Unique Listing ID.
 * @returns {Promise<object|null>} Found record or null.
 */
async function findRecordByListingId(listingId) {
    try {
        const records = await base(tableName)
            .select({
                filterByFormula: `{Listing ID} = "${listingId}"`,
            })
            .firstPage();

        return records.length > 0 ? records[0] : null;
    } catch (error) {
        logErrorMessage(`Error finding record in Airtable: ${error.message}`);
        return null;
    }
}

/**
 * Create or update a record in Airtable.
 * @param {object} fields - Data fields for Airtable.
 */
async function createOrUpdateAirtableRecord(fields) {
    try {
        const existingRecord = await findRecordByListingId(fields["Listing ID"]);

        if (existingRecord) {
            logSyncMessage(`Updating record with Listing ID: ${fields["Listing ID"]}`);
            await base(tableName).update(existingRecord.id, { fields });
        } else {
            logSyncMessage(`Creating new record with Listing ID: ${fields["Listing ID"]}`);
            await base(tableName).create([{ fields }]);
        }
    } catch (error) {
        logErrorMessage(`Airtable error: ${JSON.stringify(error.response?.data || error.message, null, 2)}`);
    }
}

/**
 * Fetch listings with statistics from the Domain API and push to Airtable.
 * @param {number} agencyId - Agency ID.
 * @param {string} agencyName - Name of the agency.
 * @returns {Promise<number>} Number of processed records.
 */
async function fetchListingsWithStatistics(agencyId, agencyName) {
    const endpoint = `${process.env.DOMAIN_API_BASE_URL}/agencies/${agencyId}/listings?pageSize=1000`;

    try {
        logSyncMessage(`Fetching listings for agency: ${agencyName}`);
        const response = await axios.get(endpoint, {
            headers: {
                Authorization: `Bearer ${process.env.DOMAIN_API_KEY}`,
                'Content-Type': 'application/json',
            },
        });

        const listings = response.data;
        let recordsProcessed = 0;

        if (Array.isArray(listings)) {
            for (const listing of listings) {
                const listingId = listing.id;
                const statistics = await fetchListingStatistics(listingId);

                const fields = {
                    "Listing ID": listingId,
                    "Property Address": listing.addressParts?.displayAddress || null,
                    "Suburb": listing.addressParts?.suburb || null,
                    "Office": agencyName,
                    "Total Listing Views": statistics?.totalListingViews || 0,
                    "Total Enquiries": statistics?.totalEnquiries || 0,
                };

                logDebugMessage(`Payload for ListingID ${listingId}: ${JSON.stringify(fields, null, 2)}`);
                await createOrUpdateAirtableRecord(fields);
                recordsProcessed++;
            }
        }

        logSyncMessage(`${agencyName}: ${recordsProcessed} records processed.`);
        return recordsProcessed;
    } catch (error) {
        logErrorMessage(`Error fetching listings for agency ${agencyName}: ${error.message}`);
        return 0;
    }
}

/**
 * Process all agencies and fetch listings with statistics.
 * @returns {Promise<object>} Record counts for all agencies.
 */
export async function fetchAllAgenciesListingsWithStatistics() {
    const recordCounts = {};

    for (const agency of agencies) {
        const count = await fetchListingsWithStatistics(agency.id, agency.name);
        recordCounts[agency.name] = count;
    }

    return recordCounts;
}