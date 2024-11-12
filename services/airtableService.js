import Airtable from 'airtable';
import fs from 'fs';
import path from 'path';

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
        if (error.message.includes('ENOTFOUND')) {
            console.warn('Network issue detected. Consider retrying.');
        }
        throw error; // Propagate error for higher-level handling
    }
}

/**
 * Validate a record before sending it to Airtable.
 * @param {object} record - Transformed Airtable record.
 * @returns {Array<string>} - List of validation errors.
 */
function validateRecord(record) {
    const errors = [];
    if (!record.ListingID) {
        errors.push('Missing required field: ListingID');
    }

    // Example: Check character limit for specific fields
    for (const [field, value] of Object.entries(record)) {
        if (typeof value === 'string' && value.length > 100000) {
            errors.push(`Field "${field}" exceeds 100,000 characters.`);
        }
    }

    return errors;
}

/**
 * Validate Airtable record format.
 * @param {object} record - Transformed Airtable record.
 */
function validateRecordFormat(record) {
    if (!record || typeof record !== 'object' || !record.fields) {
        throw new Error('Invalid record format: Missing "fields" object.');
    }

    if (!record.fields.ListingID) {
        throw new Error('Invalid record format: Missing required field "ListingID".');
    }
}

/**
 * Log record data to verify format before pushing.
 * @param {object} record - Record to log.
 */
function logRecord(record) {
    console.log('Prepared Airtable record:', JSON.stringify(record, null, 2));
}

/**
 * Create or update a record in Airtable.
 * @param {object} record - Transformed Airtable record.
 */
async function createOrUpdateRecord(record) {
    const uniqueId = record.ListingID;

    const validationErrors = validateRecord(record);
    if (validationErrors.length > 0) {
        console.warn(`Validation errors for ListingID ${uniqueId}:`, validationErrors);
        throw new Error(`Validation failed for ListingID ${uniqueId}: ${validationErrors.join(', ')}`);
    }

    logRecord(record); // Log record to verify format

    try {
        const existingRecord = await findRecordByUniqueId(uniqueId);

        if (existingRecord) {
            console.log(`Updating record with ListingID: ${uniqueId}`);
            await base(tableName).update(existingRecord.id, { fields: record });
        } else {
            console.log(`Creating new record with ListingID: ${uniqueId}`);
            await base(tableName).create([{ fields: record }]);
        }
    } catch (error) {
        console.error(`Error creating or updating record with ListingID: ${uniqueId}`, error.message);
        if (error.response?.data) {
            console.error('Airtable API Response:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
}

/**
 * Log records to a JSON file for debugging.
 * @param {Array<object>} records - Records to log.
 */
function logRecordsToFile(records) {
    const logsDir = path.join(process.cwd(), 'logs');
    const logsFile = path.join(logsDir, 'failed-records.json');

    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir);
    }

    fs.writeFileSync(logsFile, JSON.stringify(records, null, 2));
    console.log(`Failed records logged to ${logsFile}`);
}

/**
 * Push data to Airtable.
 * @param {Array<object>} records - Array of transformed Airtable records.
 */
export async function pushDataToAirtable(records) {
    const failedRecords = [];

    for (const record of records) {
        try {
            await createOrUpdateRecord(record);
        } catch (error) {
            console.error(`Failed to push record with ListingID: ${record.ListingID}`, error.message);
            failedRecords.push(record);

            if (error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'] || 1;
                console.warn(`Rate limit hit. Retrying after ${retryAfter} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            }
        }
    }

    if (failedRecords.length > 0) {
        console.warn(`Retrying ${failedRecords.length} failed record(s)...`);
        for (const failedRecord of failedRecords) {
            try {
                await createOrUpdateRecord(failedRecord);
            } catch (error) {
                console.error(`Retry failed for ListingID ${failedRecord.ListingID}:`, error.message);
            }
        }

        // Log failed records after retry
        if (failedRecords.length > 0) {
            logRecordsToFile(failedRecords);
        }
    } else {
        console.log('All records successfully pushed to Airtable.');
    }
}