import { pushDataToAirtable } from '../../shared/services/airtableService.js';
import { fetchAnalyticsData } from '../services/analyticsApiService.js';
import { transformAnalyticsData } from '../services/dataTransformer.js';
import { logSyncMessage, logErrorMessage } from '../../shared/services/logger.js';

/**
 * Main sync function for Facebook and Instagram Analytics.
 * @param {Function} sendProgressUpdate - Function to send progress updates via SSE.
 */
async function analyticsSync(sendProgressUpdate) {
    let successCount = 0;
    let failedCount = 0;

    try {
        logSyncMessage('Starting Facebook and Instagram Analytics sync...');

        sendProgressUpdate({ step: 1, total: 4, message: 'Fetching analytics data...' });
        const analyticsData = await fetchAnalyticsData();

        sendProgressUpdate({ step: 2, total: 4, message: 'Transforming data...' });
        const transformedData = transformAnalyticsData(analyticsData);

        if (!transformedData || transformedData.length === 0) {
            throw new Error('No valid data to sync.');
        }

        sendProgressUpdate({ step: 3, total: 4, message: 'Pushing data to Airtable...' });

        for (const record of transformedData) {
            try {
                await pushDataToAirtable([record]);
                successCount++;
            } catch (error) {
                logErrorMessage(`Failed to push record for ${record.fields.PageName}: ${error.message}`);
                failedCount++;
            }
        }

        sendProgressUpdate({ step: 4, total: 4, message: 'Finalizing sync...' });

        logSyncMessage(`Facebook & Instagram Analytics sync completed. Success: ${successCount}, Failed: ${failedCount}`);
    } catch (error) {
        logErrorMessage(`Facebook & Instagram Analytics sync failed: ${error.message}`);
        throw error;
    }
}

export default analyticsSync;