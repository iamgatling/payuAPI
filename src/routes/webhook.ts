import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import payments from '../store';
import { processPayment } from '../services/paymentProcessor';
import { Payment } from '../types';

const router = Router();

router.post('/webhook', async (req: Request, res: Response): Promise<any> => {
    const signature = req.headers['x-webhook-signature'];
    const secret = process.env.WEBHOOK_SECRET;

    if (!secret) {
        console.warn(' [Webhook] WEBHOOK_SECRET is not set. Refusing event.');
        return res.status(500).json({ error: 'Webhook secret is not configured' });
    }

    if (!signature) {
        return res.status(401).json({ error: 'Missing X-Webhook-Signature header' });
    }

    const rawBody = (req as any).rawBody || '';
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

    if (signature !== expectedSignature) {
        console.error(' [Webhook] Invalid signature');
        return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    const { payment_id, amount, status, user } = req.body;

    if (!payment_id || amount == null || !status || !user) {
        return res.status(400).json({
            error: 'Missing required fields: payment_id, amount, status, user',
        });
    }

    const existing = await payments.get(payment_id);
    if (existing) {
        console.log(` [Webhook] Ignored duplicate payment event for ${payment_id}`);
        return res.status(202).json({
            message: 'Payment event already received',
            payment_id,
        });
    }

    const payment: Payment = {
        payment_id,
        amount,
        status,          
        user,
        receivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    console.log('\n [Webhook] Incoming payment event:');
    console.log(JSON.stringify(payment, null, 2));

    await payments.set(payment);
    processPayment(payment_id);

    return res.status(202).json({
        message: 'Payment event received — processing in background',
        payment_id,
    });
});

router.get('/payments', async (req: Request, res: Response): Promise<any> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({ error: 'Invalid page or limit parameters. Limit must be between 1 and 100.' });
    }

    const result = await payments.getPaginated(page, limit);
    return res.json(result);
});

router.get('/payments/:id/history', async (req: Request, res: Response): Promise<any> => {
    const id = typeof req.params.id === 'string' ? req.params.id : String(req.params.id);
    const history = await payments.getHistory(id);
    return res.json({ payment_id: id, history });
});

export default router;
