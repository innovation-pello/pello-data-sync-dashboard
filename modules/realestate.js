import { pushDataToAirtable } from '../services/airtableService.js'; // Airtable service
import { transformDataForAirtable } from '../services/dataTransformer.js'; // Data transformer
import { fetchDataFromAPI, fetchListingPerformanceData } from '../services/apiService.js';
import logger from '../services/logger.js'; // Ensure logger is imported correctly

/**
 * Main sync function for Realestate.com.au
 * @param {Function} sendProgressUpdate - Callback for sending progress updates
 */
async function realestateSync(sendProgressUpdate) {
    let successCount = 0;
    let failedCount = 0;

    try {
        logger.info('Starting Realestate.com.au sync...');

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
                logger.warn(`Performance data fetch failed for ListingID ${listingId}: ${error.message}`);
            }
        }

        sendProgressUpdate({ step: 3, total: 5, message: 'Transforming data...' });
        const transformedData = await transformDataForAirtable(apiData, performanceDataMap);

        if (!transformedData || transformedData.length === 0) {
            throw new Error('No valid data to sync.');
        }

        // Commenting out record-level logging for brevity
        // transformedData.forEach(record => {
        //     logger.info(`Transformed Record for ListingID ${record.fields.ListingID}: ${JSON.stringify(record, null, 2)}`);
        // });

        sendProgressUpdate({ step: 4, total: 5, message: 'Pushing data to Airtable...' });
        for (const record of transformedData) {
            try {
                await pushDataToAirtable([record]); // Push one record at a time
                logger.info(`Successfully pushed record with ListingID: ${record.fields.ListingID}`);
                successCount++;
            } catch (error) {
                logger.error(`Failed to push record with ListingID ${record.fields.ListingID}: ${error.message}`);
                failedCount++;
            }
        }

        sendProgressUpdate({ step: 5, total: 5, message: 'Finalizing sync...' });

        logger.info(`Realestate.com.au — Sync completed. Success: ${successCount}, Failed: ${failedCount}`);
        return { success: true, successCount, failedCount };
    } catch (error) {
        logger.error(`Sync failed: ${error.message}`);
        throw error;
    }
}

export default realestateSync;