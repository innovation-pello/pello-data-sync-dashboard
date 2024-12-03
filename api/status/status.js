import express from 'express';
import { getLastSyncTimestamp } from '../../platforms/shared/services/logger.js'; // Adjusted relative path
import { memoryTokens } from '../../platforms/shared/services/auth.js'; // Adjusted relative path

const router = express.Router();

// Route to fetch platform statuses
router.get('/', (req, res) => {
    try {
        const platforms = [
            {
                platform: 'Realestate.com.au',
                status: 'Connected',
                lastSync: getLastSyncTimestamp('Realestate.com.au'),
            },
            {
                platform: 'Domain.com.au',
                status: memoryTokens.accessToken ? 'Connected' : 'Not Authorized',
                lastSync: getLastSyncTimestamp('Domain.com.au'),
            },
            {
                platform: 'Facebook & Instagram',
                status: memoryTokens.accessToken ? 'Connected' : 'Not Authorized',
                lastSync: getLastSyncTimestamp('Facebook & Instagram'),
            },
        ];

        res.status(200).json(platforms);
    } catch (error) {
        console.error('Failed to fetch platform statuses:', error.message);
        res.status(500).json({ error: 'Failed to fetch platform statuses.' });
    }
});

export default router;