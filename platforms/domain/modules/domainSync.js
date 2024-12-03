import { pushDataToAirtable } from '../../shared/services/airtableService.js'; // Shared Airtable service
import { transformDataForAirtable } from '../services/dataTransformer.js'; // Domain-specific data transformer
import { fetchDomainData, fetchDomainPerformanceData } from '../services/domainApiService.js'; // Domain API services
import { logSyncMessage, logErrorMessage } from '../../shared/services/logger.js'; // Shared logger

/**
 * Sync function for Domain.com.au.
 * @param {Function} sendProgressUpdate - Function to send progress updates via SSE.
 */
async function domainSync(sendProgressUpdate) {
    let successCount = 0;
    let failedCount = 0;
    const failedRecords = []; // Track failed records for detailed debugging

    try {
        logSyncMessage('Starting Domain.com.au sync...');

        sendProgressUpdate({ step: 1, total: 5, message: 'Fetching data from API...' });
        const apiData = await fetchDomainData();

        if (!apiData?.listings || apiData.listings.length === 0) {
            throw new Error('No property data available from Domain API.');
        }

        logSyncMessage(`Fetched ${apiData.listings.length} listings from Domain API.`);

        sendProgressUpdate({ step: 2, total: 5, message: 'Fetching performance data...' });
        const performanceDataMap = {};

        for (const listing of apiData.listings) {
            const listingId = String(listing.listingId).trim();
            try {
                const performanceData = await fetchDomainPerformanceData(listingId);
                if (performanceData) {
                    performanceDataMap[listingId] = performanceData;
                } else {
                    logErrorMessage(`No performance data for ListingID ${listingId}`);
                }
            } catch (error) {
                logErrorMessage(`Failed to fetch performance data for ListingID ${listingId}: ${error.message}`);
            }
        }

        sendProgressUpdate({ step: 3, total: 5, message: 'Transforming data...' });
        const transformedData = await transformDataForAirtable(apiData, performanceDataMap);

        if (!transformedData || transformedData.length === 0) {
            throw new Error('No valid data to sync to Airtable.');
        }

        logSyncMessage(`Transformed ${transformedData.length} records for Airtable.`);

        sendProgressUpdate({ step: 4, total: 5, message: 'Pushing data to Airtable...' });

        for (const record of transformedData) {
            try {
                await pushDataToAirtable([record]); // Push one record at a time
                logSyncMessage(`Successfully pushed ListingID: ${record.fields.ListingID}`);
                successCount++;
            } catch (error) {
                const errorMessage = `Failed to push record with ListingID: ${record.fields.ListingID}, Error: ${error.message}`;
                logErrorMessage(errorMessage);
                failedCount++;
                failedRecords.push({ ListingID: record.fields.ListingID, error: error.message });
            }
        }

        sendProgressUpdate({ step: 5, total: 5, message: 'Finalizing sync...' });

        logSyncMessage(`Domain.com.au sync completed. Success: ${successCount}, Failed: ${failedCount}`);

        if (failedRecords.length > 0) {
            logErrorMessage(
                `Some records failed to sync: ${failedRecords
                    .map(record => `ListingID: ${record.ListingID}, Error: ${record.error}`)
                    .join('; ')}`
            );
            throw new Error(`Domain sync partially failed. Check logs for details.`);
        }

        return { success: true, successCount, failedCount };
    } catch (error) {
        logErrorMessage(`Domain.com.au sync failed: ${error.message}`);
        throw error; // Propagate the error for higher-level handling
    }
}

export default domainSync;