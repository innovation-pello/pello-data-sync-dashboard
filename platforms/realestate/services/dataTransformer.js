import { logErrorMessage, logWarningMessage, logSyncMessage } from '../../shared/services/logger.js'; // Shared logger

/**
 * Process a single listing and transform it into Airtable record format.
 * @param {object} property - API data for the listing.
 * @param {object} performanceData - Performance metrics for the listing.
 * @returns {object|null} - Transformed Airtable record or null if performance data is missing.
 */
export function processSingleListing(property, performanceData) {
    if (!property) {
        logWarningMessage('No property data available to process.');
        return null;
    }

    const listingId = String(property.listingId).trim();
    if (!listingId) {
        logWarningMessage('Property data is missing a valid ListingID.');
        return null;
    }

    logSyncMessage(`Processing ListingID: ${listingId}`);

    if (!performanceData || performanceData.listing?.id !== listingId) {
        logWarningMessage(`No matching performance data found for ListingID: ${listingId}`);
        return null;
    }

    const fieldMapping = {
        pageView: 'PageViews',
        emailEnquiry: 'EmailEnquiries',
        propertyDetailPhotoView: 'PropertyDetailPhotoViews',
        videoView: 'VideoViews',
        floorplanView: 'FloorplanViews',
    };

    const metrics = {};
    if (performanceData.portalMetrics) {
        performanceData.portalMetrics.forEach(portal => {
            portal.all.forEach(metric => {
                metric.metricPeriods[0]?.metricValues.forEach(({ name, value }) => {
                    if (fieldMapping[name]) {
                        metrics[fieldMapping[name]] = value;
                    }
                });
            });
        });
    }

    const transformedRecord = {
        UniqueID: property.uniqueID || '',
        AgentID: property.agentID || '',
        ListingID: property.listingId || '',
        Status: property?.$?.status || 'unknown',
        UnderOffer: property.underOffer?.$?.value || 'no',
        IsHomeLandPackage: property.isHomeLandPackage?.$?.value || 'no',
        Municipality: property.municipality || '',
        Address: `${property.address?.streetNumber || ''} ${property.address?.street || ''}, ${property.address?.suburb || ''}, ${property.address?.state || ''} ${property.address?.postcode || ''}`.trim(),
        Description: property.description || '',
        "Price Guide": parseFloat(property.price?._?.replace(/[^0-9.]/g, '') || 0),
        Bedrooms: property.features?.bedrooms || '0',
        Bathrooms: property.features?.bathrooms || '0',
        CarSpaces: property.features?.carports || '0',
        PropertyImages: (property.objects?.img || []).map(img => ({ url: img.$?.url })),
        ...metrics, // Add mapped metrics
    };

    logSyncMessage(`Transformed record for ListingID ${listingId}: ${JSON.stringify(transformedRecord, null, 2)}`);

    return { fields: transformedRecord }; // Return Airtable-compatible record
}

/**
 * Transform multiple listings into Airtable-ready records.
 * @param {object} apiData - API data for multiple listings.
 * @param {object} performanceDataMap - A map of listing IDs to their performance data.
 * @returns {Array<object>} - Array of transformed records.
 */
export async function transformDataForAirtable(apiData, performanceDataMap) {
    const properties = Array.isArray(apiData.propertyList?.residential)
        ? apiData.propertyList.residential
        : [apiData.propertyList?.residential].filter(Boolean);

    if (!properties.length) {
        logWarningMessage('No properties found in API data.');
        return [];
    }

    const transformedRecords = [];
    for (const property of properties) {
        try {
            const listingId = String(property?.listingId).trim();
            if (!listingId) {
                logWarningMessage('Skipping property without a valid ListingID.');
                continue;
            }

            const performanceData = performanceDataMap[listingId];
            if (!performanceData) {
                logWarningMessage(`Performance data not found for ListingID: ${listingId}`);
                continue;
            }

            const record = processSingleListing(property, performanceData);
            if (record) {
                transformedRecords.push(record);
            } else {
                logWarningMessage(`Skipping ListingID ${listingId} due to transformation issues.`);
            }
        } catch (error) {
            logErrorMessage(`Error processing property: ${error.message}`);
        }
    }

    logSyncMessage(`Total transformed records: ${transformedRecords.length}`);
    return transformedRecords;
}