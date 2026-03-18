const { Router } = require('express');
const payments = require('../store');
const { processPayment } = require('../services/paymentProcessor');

const router = Router();

router.post('/webhook', (req, res) => {
    const { payment_id, amount, status, user } = req.body;

    
    if (!payment_id || amount == null || !status || !user) {
        return res.status(400).json({
            error: 'Missing required fields: payment_id, amount, status, user',
        });
    }

    const payment = {
        payment_id,
        amount,
        status,          
        user,
        receivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    
    console.log('\n [Webhook] Incoming payment event:');
    console.log(JSON.stringify(payment, null, 2));

    
    payments.set(payment_id, payment);
    processPayment(payment_id);

    return res.status(202).json({
        message: 'Payment event received — processing in background',
        payment_id,
    });
});

router.get('/payments', (_req, res) => {
    const all = [...payments.values()];
    return res.json({ count: all.length, payments: all });
});

module.exports = router;
