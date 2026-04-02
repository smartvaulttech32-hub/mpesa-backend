const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// REPLACE WITH YOUR SAFARICOM CREDENTIALS
const MPESA_CONFIG = {
    consumerKey: 'YOUR_CONSUMER_KEY_HERE',
    consumerSecret: 'YOUR_CONSUMER_SECRET_HERE',
    shortCode: '174379',
    passkey: 'YOUR_PASSKEY_HERE',
    callbackUrl: 'https://your-backend.onrender.com/api/callback'
};

app.get('/', (req, res) => {
    res.json({ message: 'M-Pesa API Server is running!' });
});

app.post('/api/stkpush', async (req, res) => {
    res.json({ success: true, message: 'STK Push endpoint ready' });
});

app.post('/api/callback', (req, res) => {
    console.log('Callback received:', req.body);
    res.json({ ResultCode: 0 });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));