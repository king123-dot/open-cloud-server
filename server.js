require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'roblox-open-cloud'
    });
});

// Upload clothing asset
app.post('/api/upload-clothing', async (req, res) => {
    try {
        const { imageData, assetType, displayName, description, creatorType, creatorTargetId } = req.body;
        
        if (!imageData || !assetType || !displayName) {
            return res.status(400).json({ 
                error: 'Missing required fields' 
            });
        }

        const apiKey = process.env.ROBLOX_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ 
                error: 'Server not configured with API key' 
            });
        }

        const url = 'https://apis.roblox.com/assets/v1/assets';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                assetType: assetType,
                displayName: displayName,
                description: description || '',
                creator: {
                    creatorType: creatorType || 'User',
                    creatorTargetId: creatorTargetId
                },
                file: imageData
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return res.status(response.status).json({ 
                error: 'Roblox API error',
                details: errorText
            });
        }

        const result = await response.json();
        res.json(result);

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Open Cloud server running on port ${PORT}`);
});