const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// YOUR CREDENTIALS - Update these
const MPESA_CONFIG = {
    consumerKey: '4qaHyuKfjFK0aqPfTmfLOC8ylaQVpRaRGgypQzHa0YBGngAZ',      // ← From Safaricom My Apps
    consumerSecret: 'Gl6rz6XApD8qp1l8uNmpsfgnuMYy8PNljXKItswq3eN3e0MWBf37pKaAPFD99RDS', // ← From Safaricom My Apps
    shortCode: '174379',
    passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
    callbackUrl: 'https://mpesa-backend-sh5t.onrender.com/api/callback'
};

// Get OAuth token from Safaricom
async function getAccessToken() {
    const auth = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');
    const response = await axios.get(
        'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        { headers: { Authorization: `Basic ${auth}` } }
    );
    return response.data.access_token;
}

// Root endpoint
app.get('/', (req, res) => {
    res.json({ status: 'active', message: 'M-Pesa API Server is running!' });
});

// STK Push endpoint - sends payment prompt to customer's phone
app.post('/api/stkpush', async (req, res) => {
    try {
        const { phoneNumber, amount, orderId } = req.body;
        
        console.log(`📱 STK Push Request - Order: ${orderId}, Amount: KES ${amount}, Phone: ${phoneNumber}`);
        
        const token = await getAccessToken();
        
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
        const password = Buffer.from(`${MPESA_CONFIG.shortCode}${MPESA_CONFIG.passkey}${timestamp}`).toString('base64');
        
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
            TransactionDesc: `Payment for order ${orderId}`
        };
        
        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            data,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log('✅ STK Push sent successfully');
        res.json({ success: true, data: response.data });
        
    } catch (error) {
        console.error('❌ STK Push error:', error.response?.data || error.message);
        res.json({ success: false, error: error.response?.data || error.message });
    }
});

// Callback endpoint - M-Pesa sends payment confirmation here
app.post('/api/callback', (req, res) => {
    console.log('📞 M-Pesa Callback received:', JSON.stringify(req.body, null, 2));
    
    const resultCode = req.body.Body?.stkCallback?.ResultCode;
    
    if (resultCode === 0) {
        const metadata = req.body.Body.stkCallback.CallbackMetadata.Item;
        const amount = metadata.find(m => m.Name === 'Amount')?.Value;
        const mpesaCode = metadata.find(m => m.Name === 'MpesaReceiptNumber')?.Value;
        const orderId = req.body.Body.stkCallback.MerchantRequestID;
        
        console.log(`✅ Payment SUCCESS! Order: ${orderId}, Amount: KES ${amount}, M-Pesa Code: ${mpesaCode}`);
        
        // Here you would update your Google Sheets order status to "PAID"
    } else {
        console.log(`❌ Payment FAILED: ${req.body.Body?.stkCallback?.ResultDesc}`);
    }
    
    res.json({ ResultCode: 0, ResultDesc: "Success" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
