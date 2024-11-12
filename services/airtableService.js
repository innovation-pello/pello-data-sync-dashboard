const Airtable = require('airtable');

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const tableName = process.env.AIRTABLE_TABLE_NAME;

/**
 * Find record in Airtable by unique identifier (e.g., ListingID).
 * @param {string} uniqueId - Unique ID of the record.
 * @returns {Promise<object|null>} - Found record or null.
 */
async function findRecordByUniqueId(uniqueId) {
    try {
        const records = await base(tableName).select({
            filterByFormula: `{ListingID} = "${uniqueId}"`,
        }).firstPage();

        return records.length > 0 ? records[0] : null;
    } catch (error) {
        console.error('Error finding record by Unique ID:', error.message);
        return null;
    }
}

/**
 * Create or update a record in Airtable.
 * @param {object} record - Transformed Airtable record.
 */
async function createOrUpdateRecord(record) {
    try {
        const uniqueId = record.ListingID; // No "fields" key here
        const existingRecord = await findRecordByUniqueId(uniqueId);

        if (existingRecord) {
            console.log(`Updating record with ListingID: ${uniqueId}`);
            await base(tableName).update(existingRecord.id, record); // No 'fields' key
        } else {
            console.log(`Creating new record with ListingID: ${uniqueId}`);
            await base(tableName).create([record]); // No 'fields' key
        }
    } catch (error) {
        console.error(`Error creating or updating record with ListingID: ${record.ListingID}`, error.message);
        throw error;
    }
}

/**
 * Push data to Airtable.
 * @param {Array<object>} records - Array of transformed Airtable records.
 */
async function pushDataToAirtable(records) {
    try {
        console.log(`Pushing ${records.length} records to Airtable...`);
        for (const record of records) {
            await createOrUpdateRecord(record); // Process each record
        }
        console.log('All records successfully pushed to Airtable.');
    } catch (error) {
        console.error('Error pushing data to Airtable:', error.message);
        throw new Error('Airtable sync error: ' + error.message);
    }
}

module.exports = { pushDataToAirtable };