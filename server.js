const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// REPLACE WITH YOUR SAFARICOM CREDENTIALS
const MPESA_CONFIG = {
    consumerKey: '4qaHyuKfjFK0aqPfTmfLOC8ylaQVpRaRGgypQzHa0YBGngAZ',
    consumerSecret: 'Gl6rz6XApD8qp1l8uNmpsfgnuMYy8PNljXKItswq3eN3e0MWBf37pKaAPFD99RDS',
    shortCode: '174379',
    passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
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
