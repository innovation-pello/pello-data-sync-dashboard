import { fetchDataFromAPI, fetchListingPerformanceData } from '../services/realestateApiService.js'; // Realestate API Service
import { transformDataForAirtable } from '../services/dataTransformer.js'; // Transform data
import { pushDataToAirtable } from '../../shared/services/airtableService.js'; // Airtable service
import { logSyncMessage, logErrorMessage } from '../../shared/services/logger.js'; // Shared logger

/**
 * Main Realestate sync function.
 * @param {Function} sendProgressUpdate - Callback for sending progress updates.
 */
export default async function realestateSync(sendProgressUpdate) {
    let successCount = 0;
    let failedCount = 0;

    try {
        logSyncMessage('Starting Realestate.com.au sync...');

        sendProgressUpdate({ step: 1, total: 5, message: 'Fetching property data...' });
        const apiData = await fetchDataFromAPI();

        if (!apiData?.propertyList?.residential) {
            throw new Error('No property data available from API.');
        }

        sendProgressUpdate({ step: 2, total: 5, message: 'Fetching performance data...' });

        const performanceDataMap = {};
        for (const property of apiData.propertyList.residential) {
            const listingId = property.listingId ? String(property.listingId).trim() : null;
            if (!listingId) {
                logErrorMessage('Property listing ID is missing or invalid.');
                continue;
            }
            try {
                const performanceData = await fetchListingPerformanceData(listingId);
                performanceDataMap[listingId] = performanceData;
            } catch (error) {
                logErrorMessage(`Performance data fetch failed for Listing ID ${listingId}: ${error.message}`);
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
                failedCount++;
                logErrorMessage(`Failed to push record with ListingID ${record.fields.ListingID}: ${error.message}`);
            }
        }

        sendProgressUpdate({ step: 5, total: 5, message: 'Finalizing sync...' });

        logSyncMessage(
            JSON.stringify({
                summary: 'Realestate.com.au sync completed',
                success: successCount,
                failed: failedCount,
            })
        );
        return { success: true, successCount, failedCount };
    } catch (error) {
        logErrorMessage(`Realestate.com.au sync failed: ${error.message}`);
        throw error;
    }
}