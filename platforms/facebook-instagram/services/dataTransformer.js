/**
 * Transform Facebook & Instagram analytics data to Airtable format.
 * @param {object} analyticsData - Raw data from API.
 * @returns {Array<object>} Transformed records.
 */
export function transformAnalyticsData(analyticsData) {
    if (!analyticsData || !analyticsData.data) {
        console.warn('No analytics data available for transformation.');
        return [];
    }

    return analyticsData.data.map(dataPoint => ({
        fields: {
            PageName: dataPoint.title || 'Unknown',
            Metric: dataPoint.name || 'Unknown',
            Value: dataPoint.values?.[0]?.value || 0,
            Date: dataPoint.values?.[0]?.end_time || new Date().toISOString(),
        }
    }));
}