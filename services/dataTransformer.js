/**
 * Process a single listing and transform it into Airtable record format.
 * @param {object} property - API data for the listing.
 * @param {object} performanceData - Performance metrics for the listing.
 * @returns {object|null} - Transformed Airtable record or null if performance data is missing.
 */
export function processSingleListing(property, performanceData) {
    if (!property) {
        console.warn('No property data available to process.');
        return null;
    }

    const listingId = String(property.listingId).trim();
    console.log('Processing ListingID:', listingId);

    if (!performanceData || performanceData.listing?.id !== listingId) {
        console.warn(`No matching performance data found for ListingID: ${listingId}`);
        return null;
    }

    console.log('Fetched Performance Data:', JSON.stringify(performanceData, null, 2));

    const fieldMapping = {
        pageView: 'PageViews',
        emailEnquiry: 'EmailEnquiries',
        searchResultPhotoView: 'SearchResultPhotoViews',
        expandMap: 'ExpandMap',
        videoView: 'VideoViews',
        propertyDetailPhotoView: 'PropertyDetailPhotoViews',
        floorplanView: 'FloorplanViews',
        virtualTourView: 'VirtualTourViews',
        '3dTourView': '3DTourViews',
        revealedAgentPhoneNumber: 'RevealedAgentPhoneNumber',
        rentalAppliedOnline: 'RentalAppliedOnline',
        appliedForInspection: 'AppliedForInspection',
        savedInspectionTime: 'SavedInspectionTime',
        savedAuctionTime: 'SavedAuctionTime',
        listingSaved: 'ListingSaved',
        sendToFriend: 'SendToFriend',
        viewStatementOfInformation: 'ViewStatementOfInformation',
        searchResultsPageImpression: 'SearchResultsPageImpression',
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
        Authority: property.authority?.$?.value || 'none',
        Municipality: property.municipality || '',
        Category: property.category?.$?.name || '',
        Address: `${property.address?.street || ''}, ${property.address?.suburb || ''}, ${property.address?.state || ''} ${property.address?.postcode || ''}`.trim(),
        Headline: property.headline || '',
        Description: property.description || '',
        Price: parseFloat(property.price?._?.replace(/[^0-9.]/g, '') || 0),
        Bedrooms: property.features?.bedrooms || '0',
        Bathrooms: property.features?.bathrooms || '0',
        CarSpaces: property.features?.carports || '0',
        PropertyImages: (property.objects?.img || []).map(img => ({ url: img.$?.url })),
        ...metrics,
    };

    console.log(`Transformed record for ListingID: ${listingId}`, transformedRecord);

    // Wrap in fields object as expected by Airtable
    return { fields: transformedRecord };
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

    if (!properties || properties.length === 0) {
        console.warn('No properties found in API data.');
        return [];
    }

    const transformedRecords = [];
    for (const property of properties) {
        const listingId = String(property?.listingId).trim();
        if (!listingId) {
            console.warn('Missing listingId, skipping property.');
            continue;
        }

        const performanceData = performanceDataMap[listingId];
        if (!performanceData) {
            console.warn(`Performance data not found for ListingID: ${listingId}`);
            continue;
        }

        try {
            const record = processSingleListing(property, performanceData);
            if (record) {
                transformedRecords.push(record);
            } else {
                console.warn(`Skipping ListingID ${listingId} due to transformation issues.`);
            }
        } catch (error) {
            console.error(`Error processing ListingID ${listingId}:`, error.message);
        }
    }

    console.log('Transformed Records:', JSON.stringify(transformedRecords, null, 2));

    return transformedRecords;
}