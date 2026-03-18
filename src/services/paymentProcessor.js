const payments = require('../store');

function processPayment(paymentId) {
    const delay = Math.floor(Math.random() * 2000) + 3000; 

    console.log(` [Processor] Queued payment ${paymentId} — processing in ${delay}ms`);

    
    const payment = payments.get(paymentId);
    if (!payment) return;
    payment.status = 'processing';

    setTimeout(() => {
        const p = payments.get(paymentId);
        if (!p) return;

        
        if (Math.random() < 0.2) {
            p.status = 'failed';
            p.updatedAt = new Date().toISOString();
            console.log(` [Processor] Payment ${paymentId} FAILED — scheduling retry…`);
            logTable();
            retryPayment(paymentId);
            return;
        }

        p.status = 'processed';
        p.updatedAt = new Date().toISOString();
        console.log(` [Processor] Payment ${paymentId} PROCESSED`);
        logTable();
    }, delay);
}

function retryPayment(paymentId) {
    const retryDelay = Math.floor(Math.random() * 2000) + 2000;
    console.log(` [Processor] Retrying payment ${paymentId} in ${retryDelay}ms`);

    setTimeout(() => {
        const p = payments.get(paymentId);
        if (!p) return;

        p.status = 'processed';
        p.updatedAt = new Date().toISOString();
        console.log(` [Processor] Payment ${paymentId} PROCESSED (after retry)`);
        logTable();
    }, retryDelay);
}

function logTable() {
    const rows = [...payments.values()].map((p) => ({
        payment_id: p.payment_id,
        user: p.user,
        amount: p.amount,
        status: p.status,
        receivedAt: p.receivedAt,
        updatedAt: p.updatedAt,
    }));
    console.log('\n Current payments:');
    console.table(rows);
}

module.exports = { processPayment };
