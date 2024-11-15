import Airtable from 'airtable';
import fs from 'fs';
import path from 'path';
import logger from '../services/logger.js';

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const tableName = process.env.AIRTABLE_TABLE_NAME;

/**
 * Find record in Airtable by unique identifier (e.g., ListingID).
 * @param {string} uniqueId - Unique ID of the record.
 * @returns {Promise<object|null>} - Found record or null.
 */
async function findRecordByUniqueId(uniqueId) {
    try {
        const records = await base(tableName)
            .select({
                filterByFormula: `{ListingID} = "${uniqueId}"`,
            })
            .firstPage();
        return records.length > 0 ? records[0] : null;
    } catch (error) {
        logger.error(`Error finding record by Unique ID (${uniqueId}): ${error.message}`);
        if (error.message.includes('ENOTFOUND')) {
            logger.warn('Network issue detected. Consider retrying.');
        }
        throw error;
    }
}

/**
 * Validate a record before sending it to Airtable.
 * @param {object} fields - Transformed Airtable record fields.
 * @returns {Array<string>} - List of validation errors.
 */
function validateRecord(fields) {
    const errors = [];
    if (!fields.ListingID) {
        errors.push('Missing required field: ListingID');
    }

    for (const [field, value] of Object.entries(fields)) {
        if (typeof value === 'string' && value.length > 100000) {
            errors.push(`Field "${field}" exceeds 100,000 characters.`);
        }
    }

    return errors;
}

/**
 * Log record data to verify format before pushing.
 * @param {object} record - Record to log.
 */
function logRecord(record) {
    logger.info(`Prepared Airtable record: ${JSON.stringify(record, null, 2)}`);
}

/**
 * Create or update a record in Airtable.
 * @param {object} record - Transformed Airtable record.
 */
async function createOrUpdateRecord(record) {
    const uniqueId = record.fields?.ListingID;

    if (!uniqueId) {
        throw new Error('ListingID is missing from the record.');
    }

    const validationErrors = validateRecord(record.fields); // Validate only fields
    if (validationErrors.length > 0) {
        logger.warn(`Validation errors for ListingID ${uniqueId}: ${validationErrors.join(', ')}`);
        throw new Error(`Validation failed for ListingID ${uniqueId}`);
    }

    logRecord(record); // Log record for debugging

    try {
        const existingRecord = await findRecordByUniqueId(uniqueId);

        if (existingRecord) {
            logger.info(`Updating record with ListingID: ${uniqueId}`);
            await base(tableName).update(existingRecord.id, record.fields); // Correct usage
        } else {
            logger.info(`Creating new record with ListingID: ${uniqueId}`);
            await base(tableName).create([{ fields: record.fields }]); // Correct usage
        }
    } catch (error) {
        logger.error(`Error creating/updating record with ListingID ${uniqueId}: ${error.message}`);
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
    logger.warn(`Failed records logged to ${logsFile}`);
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
            logger.error(`Failed to push record with ListingID ${record.fields?.ListingID}: ${error.message}`);
            failedRecords.push(record);

            if (error.response?.status === 429) {
                const retryAfter = error.response.headers['retry-after'] || 1;
                logger.warn(`Rate limit hit. Retrying after ${retryAfter} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
            }
        }
    }

    if (failedRecords.length > 0) {
        logger.warn(`Retrying ${failedRecords.length} failed record(s)...`);
        for (const failedRecord of failedRecords) {
            try {
                await createOrUpdateRecord(failedRecord);
            } catch (error) {
                logger.error(`Retry failed for ListingID ${failedRecord.fields?.ListingID}: ${error.message}`);
            }
        }

        if (failedRecords.length > 0) {
            logRecordsToFile(failedRecords);
        }
    } else {
        logger.info('All records successfully pushed to Airtable.');
    }
}