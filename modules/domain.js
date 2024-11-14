// Import any required modules
import { pushDataToAirtable } from '../services/airtableService.js';
import { transformDataForAirtable } from '../services/dataTransformer.js';
import { fetchDomainData, fetchDomainPerformanceData } from '../services/domainService.js';
import { logSyncMessage } from '../services/logger.js';

/**
 * Sync function for Domain.com.au.
 * @param {Function} sendProgressUpdate - Function to send progress updates via SSE.
 */
async function domainSync(sendProgressUpdate) {
    let successCount = 0;
    let failedCount = 0;
    const failedRecords = []; // Track failed records for detailed debugging

    try {
        console.log('Starting Domain.com.au sync...');

        sendProgressUpdate({ step: 1, total: 5, message: 'Fetching data from API...' });
        const apiData = await fetchDomainData();

        if (!apiData?.listings || apiData.listings.length === 0) {
            throw new Error('No property data available from API.');
        }

        sendProgressUpdate({ step: 2, total: 5, message: 'Fetching performance data...' });
        const performanceDataMap = {};

        for (const listing of apiData.listings) {
            const listingId = String(listing.listingId).trim();
            try {
                const performanceData = await fetchDomainPerformanceData(listingId);
                performanceDataMap[listingId] = performanceData;
            } catch (error) {
                console.warn(`Performance data fetch failed for ListingID ${listingId}: ${error.message}`);
            }
        }

        sendProgressUpdate({ step: 3, total: 5, message: 'Transforming data...' });
        const transformedData = await transformDataForAirtable(apiData, performanceDataMap);

        if (!transformedData || transformedData.length === 0) {
            throw new Error('No valid data to sync.');
        }

        sendProgressUpdate({ step: 4, total: 5, message: 'Pushing data to Airtable...' });

        for (const record of transformedData) {
            try {
                await pushDataToAirtable([record]); // Push one record at a time
                successCount++;
            } catch (error) {
                console.error(`Failed to push record with ListingID: ${record.ListingID}`, error.message);
                failedCount++;
                failedRecords.push({ ListingID: record.ListingID, error: error.message });
            }
        }

        sendProgressUpdate({ step: 5, total: 5, message: 'Finalizing sync...' });

        // Log the sync summary
        logSyncMessage(`Domain.com.au sync completed. Success: ${successCount}, Failed: ${failedCount}`);

        if (failedRecords.length > 0) {
            console.warn('Some records failed to sync:', failedRecords);
            throw new Error(`Domain sync partially failed. Check logs for details.`);
        }

        return { success: true, successCount, failedCount };
    } catch (error) {
        logSyncMessage(`Domain.com.au sync failed: ${error.message}`);
        console.error('Error during Domain.com.au sync:', error);
        throw error; // Propagate the error for higher-level handling
    }
}

// Export the sync function as default
export default domainSync;