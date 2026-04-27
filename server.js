require('dotenv').config();
const express = require('express');
const cors = require('cors');
const FormData = require('form-data');

// node-fetch (compatible import for Railway / Node versions)
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = process.env.PORT || 3000;

// =====================
// Middleware
// =====================
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// =====================
// Simple API security middleware
// =====================
const SERVER_SECRET = process.env.SERVER_SECRET;

app.use((req, res, next) => {
    // allow public routes
    if (req.path === '/' || req.path === '/api/health') return next();

    const key = req.headers['x-server-key'];

    if (!SERVER_SECRET) {
        return res.status(500).json({ error: 'Server not configured (missing SERVER_SECRET)' });
    }

    if (!key || key !== SERVER_SECRET) {
        return res.status(403).json({ error: 'Forbidden: invalid server key' });
    }

    next();
});

// =====================
// Root route
// =====================
app.get('/', (req, res) => {
    res.send('🚀 Roblox Open Cloud Clothing Server is running');
});

// =====================
// Health check
// =====================
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'roblox-open-cloud',
        timestamp: new Date().toISOString()
    });
});

// =====================
// Upload clothing asset
// =====================
app.post('/api/upload-clothing', async (req, res) => {
    try {
        const {
            imageData,
            assetType,
            displayName,
            description,
            creatorType,
            creatorTargetId
        } = req.body;

        // Basic validation
        if (!imageData || !assetType || !displayName || !creatorTargetId) {
            return res.status(400).json({
                error: 'Missing required fields'
            });
        }

        const apiKey = process.env.ROBLOX_API_KEY;

        if (!apiKey) {
            return res.status(500).json({
                error: 'Missing ROBLOX_API_KEY in environment variables'
            });
        }

        const url = 'https://apis.roblox.com/assets/v1/assets';

        // Convert base64 image into buffer
        const buffer = Buffer.from(imageData, 'base64');

        // Build form-data request (required for Roblox asset uploads)
        const form = new FormData();

        form.append('assetType', assetType);
        form.append('displayName', displayName);
        form.append('description', description || '');

        form.append('creator', JSON.stringify({
            creatorType: creatorType || 'User',
            creatorTargetId
        }));

        form.append('fileContent', buffer, {
            filename: 'asset.png'
        });

        // Send request to Roblox Open Cloud
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                ...form.getHeaders()
            },
            body: form
        });

        const text = await response.text();

        if (!response.ok) {
            return res.status(response.status).json({
                error: 'Roblox API error',
                details: text
            });
        }

        // Try parse JSON safely
        let result;
        try {
            result = JSON.parse(text);
        } catch {
            result = { raw: text };
        }

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// =====================
// Start server
// =====================
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
