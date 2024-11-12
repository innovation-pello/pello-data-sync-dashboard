import { pushDataToAirtable } from '../services/airtableService.js'; // Airtable service
import { transformDataForAirtable } from '../services/dataTransformer.js'; // Data transformer
import { fetchDataFromAPI, fetchListingPerformanceData } from '../services/apiService.js';
import { logSyncMessage } from '../services/logger.js'; // Logger utility

/**
 * Main sync function for Realestate.com.au
 * @param {Function} sendProgressUpdate - Callback for sending progress updates
 */
async function realestateSync(sendProgressUpdate) {
    let successCount = 0;
    let failedCount = 0;

    try {
        console.log('Starting Realestate.com.au sync...');

        sendProgressUpdate({ step: 1, total: 5, message: 'Fetching data from API...' });
        const apiData = await fetchDataFromAPI();

        if (!apiData?.propertyList?.residential) {
            throw new Error('No property data available from API.');
        }

        sendProgressUpdate({ step: 2, total: 5, message: 'Fetching performance data...' });
        const performanceDataMap = {};
        for (const property of apiData.propertyList.residential) {
            const listingId = String(property.listingId).trim();
            try {
                const performanceData = await fetchListingPerformanceData(listingId);
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
        console.log(`Pushing ${transformedData.length} records to Airtable...`);

        for (const record of transformedData) {
            try {
                await pushDataToAirtable([record]); // Push one record at a time
                successCount++;
            } catch (error) {
                console.error(`Failed to push record with ListingID: ${record.ListingID}`, error.message);
                failedCount++;
            }
        }

        sendProgressUpdate({ step: 5, total: 5, message: 'Finalizing sync...' });

        logSyncMessage(`Realestate.com.au — Sync completed. Success: ${successCount}, Failed: ${failedCount}`);
        console.log('Sync successful');
        return { success: true, successCount, failedCount };
    } catch (error) {
        logSyncMessage(`Sync failed: ${error.message}`);
        console.error('Error during Realestate.com.au sync:', error.message);
        throw error;
    }
}

export default realestateSync;