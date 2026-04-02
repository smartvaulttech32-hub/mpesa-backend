const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// M-Pesa Configuration
const MPESA_CONFIG = {
    consumerKey: '4qaHyuKfjFK0aqPfTmfLOC8ylaQVpRaRGgypQzHa0YBGngAZ',      // ← PUT YOUR REAL CONSUMER KEY
    consumerSecret: 'Gl6rz6XApD8qp1l8uNmpsfgnuMYy8PNljXKItswq3eN3e0MWBf37pKaAPFD99RDS', // ← PUT YOUR REAL CONSUMER SECRET
    shortCode: '174379',
    passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
    callbackUrl: 'https://mpesa-backend-sh5t.onrender.com/api/callback',
    environment: 'sandbox'
};

// Store payment status (in memory - for production use Google Sheets)
const paymentStatus = {};

// Get OAuth Token
async function getAccessToken() {
    const auth = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');
    const response = await axios.get(
        'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        { headers: { Authorization: `Basic ${auth}` } }
    );
    return response.data.access_token;
}

// Generate password for STK push
function generatePassword() {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${MPESA_CONFIG.shortCode}${MPESA_CONFIG.passkey}${timestamp}`).toString('base64');
    return { timestamp, password };
}

// Root endpoint
app.get('/', (req, res) => {
    res.json({ status: 'active', message: 'M-Pesa API Server is running!' });
});

// STK Push endpoint - sends payment prompt to phone
app.post('/api/stkpush', async (req, res) => {
    try {
        const { phoneNumber, amount, orderId } = req.body;
        
        console.log(`📱 STK Push - Order: ${orderId}, Amount: KES ${amount}, Phone: ${phoneNumber}`);
        
        // Initialize payment status
        paymentStatus[orderId] = { status: 'PENDING', timestamp: new Date().toISOString() };
        
        const token = await getAccessToken();
        const { timestamp, password } = generatePassword();
        
        const data = {
            BusinessShortCode: MPESA_CONFIG.shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.round(amount),
            PartyA: phoneNumber,
            PartyB: MPESA_CONFIG.shortCode,
            PhoneNumber: phoneNumber,
            CallBackURL: MPESA_CONFIG.callbackUrl,
            AccountReference: orderId,
            TransactionDesc: `Order ${orderId}`
        };
        
        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            data,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('✅ STK Push sent:', response.data.ResponseCode);
        res.json({ success: true, data: response.data });
        
    } catch (error) {
        console.error('❌ STK Push error:', error.response?.data || error.message);
        res.json({ success: false, error: error.response?.data || error.message });
    }
});

// Callback endpoint - M-Pesa sends confirmation here
app.post('/api/callback', (req, res) => {
    console.log('📞 M-Pesa Callback received');
    
    const resultCode = req.body.Body?.stkCallback?.ResultCode;
    const orderId = req.body.Body?.stkCallback?.MerchantRequestID;
    
    if (resultCode === 0) {
        const items = req.body.Body.stkCallback.CallbackMetadata.Item;
        const amount = items.find(i => i.Name === 'Amount')?.Value;
        const mpesaCode = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
        
        console.log(`✅✅✅ PAYMENT CONFIRMED! Order: ${orderId}, Amount: KES ${amount}, Code: ${mpesaCode}`);
        
        // Update payment status
        paymentStatus[orderId] = {
            status: 'PAID',
            amount: amount,
            mpesaCode: mpesaCode,
            timestamp: new Date().toISOString()
        };
    } else {
        console.log(`❌ Payment failed: ${req.body.Body?.stkCallback?.ResultDesc}`);
        paymentStatus[orderId] = {
            status: 'FAILED',
            message: req.body.Body?.stkCallback?.ResultDesc,
            timestamp: new Date().toISOString()
        };
    }
    
    res.json({ ResultCode: 0, ResultDesc: "Success" });
});

// Status endpoint - payment.html calls this to check
app.get('/api/payment-status/:orderId', (req, res) => {
    const orderId = req.params.orderId;
    const status = paymentStatus[orderId] || { status: 'PENDING' };
    res.json(status);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
