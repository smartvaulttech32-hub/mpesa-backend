const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// INTASEND CONFIGURATION
// Replace with your actual IntaSend Secret Key
// ============================================
const INTASEND_SECRET_KEY = 'ISSecretKey_live_27122124-1c7d-453d-8e54-fca30f6c550d';            // ← PASTE YOUR SECRET KEY
// Store payment status in memory
const paymentStatus = {};

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        status: 'active', 
        message: 'IntaSend API Server is running!',
        endpoints: {
            status: '/api/payment-status/:orderId',
            webhook: '/api/intasend-webhook'
        }
    });
});

// Check payment status endpoint (called by payment.html)
app.get('/api/payment-status/:orderId', (req, res) => {
    const orderId = req.params.orderId;
    const status = paymentStatus[orderId] || { status: 'PENDING' };
    console.log(`Status check for ${orderId}: ${status.status}`);
    res.json(status);
});

// IntaSend Webhook endpoint (receives payment confirmation)
app.post('/api/intasend-webhook', (req, res) => {
    console.log('📞 Webhook received:', JSON.stringify(req.body, null, 2));
    
    const { api_ref, status, amount, mpesa_receipt } = req.body;
    
    if (status === 'COMPLETE') {
        paymentStatus[api_ref] = { 
            status: 'PAID', 
            mpesaCode: mpesa_receipt, 
            amount: amount 
        };
        console.log(`✅✅✅ ORDER PAID! Order: ${api_ref}, Amount: KES ${amount}, Code: ${mpesa_receipt}`);
    } else {
        console.log(`Payment status: ${status}`);
    }
    
    res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 IntaSend Server running on port ${PORT}`);
    console.log(`📍 Webhook URL: https://mpesa-backend-sh5t.onrender.com/api/intasend-webhook`);
});
