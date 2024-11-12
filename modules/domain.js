// Import any required modules
import { pushDataToAirtable } from '../services/airtableService.js';
import { transformDataForAirtable } from '../services/dataTransformer.js';
import { fetchDomainData, fetchDomainPerformanceData } from '../services/domainService.js';
import { logSyncMessage } from '../services/logger.js';

async function domainSync(sendProgressUpdate) {
    let successCount = 0;
    let failedCount = 0;

    try {
        console.log('Starting Domain.com.au sync...');

        sendProgressUpdate({ step: 1, total: 5, message: 'Fetching data from API...' });
        const apiData = await fetchDomainData();

        if (!apiData?.listings) {
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
                await pushDataToAirtable([record]);
                successCount++;
            } catch (error) {
                console.error(`Failed to push record with ListingID: ${record.ListingID}`, error.message);
                failedCount++;
            }
        }

        sendProgressUpdate({ step: 5, total: 5, message: 'Finalizing sync...' });
        logSyncMessage(`Domain.com.au sync completed. Success: ${successCount}, Failed: ${failedCount}`);

        return { success: true, successCount, failedCount };
    } catch (error) {
        logSyncMessage(`Domain.com.au sync failed: ${error.message}`);
        throw error;
    }
}

// Export the sync function as default
export default domainSync;