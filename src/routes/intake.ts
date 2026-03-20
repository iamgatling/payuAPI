import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import eventStore from '../eventStore';
import { processEvent } from '../services/eventProcessor';
import { WebhookEvent } from '../types';
import { logger } from '../logger';

const router = Router();


router.post('/events', async (req: Request, res: Response): Promise<any> => {
    const { id, source, eventType, reference, status, payload } = req.body;

    if (!id || !source || !eventType || !reference || !status) {
        return res.status(400).json({ error: 'Missing required fields: id, source, eventType, reference, status' });
    }

    const existing = await eventStore.get(id);
    if (existing) {
        logger.info('Intake', `Ignored duplicate generic event for ${id}`);
        return res.status(202).json({ message: 'Event already received', id });
    }

    const event: WebhookEvent = {
        id,
        source,
        eventType,
        reference,
        status,
        payload: payload || {},
        receivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    logger.info('Intake', `Incoming generic event`, { event });

    await eventStore.set(event);
    processEvent(id);

    return res.status(202).json({
        message: 'Event received — processing in background',
        id
    });
});


router.post('/webhook', async (req: Request, res: Response): Promise<any> => {
    const signature = req.headers['x-webhook-signature'];
    const secret = process.env.WEBHOOK_SECRET;

    if (!secret) {
        logger.warn('Intake', 'WEBHOOK_SECRET is not set. Refusing legacy event.');
        return res.status(500).json({ error: 'Webhook secret is not configured' });
    }

    if (!signature) {
        return res.status(401).json({ error: 'Missing X-Webhook-Signature header' });
    }

    
    const rawBody = (req as any).rawBody || '';
    
    // We expect rawBody to be a Buffer or string. 
    // crypto.createHmac().update() handles both.
    const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

    if (signature !== expectedSignature) {
        logger.error('Intake', 'Invalid signature');
        return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    
    
    let payload;
    try {
        payload = JSON.parse(rawBody.toString());
    } catch (e) {
        logger.error('Intake', 'Invalid JSON body');
        return res.status(400).json({ error: 'Invalid JSON body' });
    }

    const { payment_id, amount, status, user } = payload;

    if (!payment_id || amount == null || !status || !user) {
        return res.status(400).json({
            error: 'Missing required fields: payment_id, amount, status, user',
        });
    }

    const eventId = `legacy_${payment_id}`;
    const existing = await eventStore.get(eventId);
    if (existing) {
        logger.info('Intake', `Ignored duplicate legacy event for ${eventId}`);
        return res.status(202).json({
            message: 'Payment event already received',
            id: eventId,
        });
    }

    const event: WebhookEvent = {
        id: eventId,
        source: 'legacy-webhook',
        eventType: 'payment.update',
        reference: payment_id,
        status,
        payload: { payment_id, amount, user },
        receivedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    logger.info('Intake', `Incoming legacy payment event transformed`, { event });

    await eventStore.set(event);
    processEvent(eventId);

    return res.status(202).json({
        message: 'Payment event received — processing in background',
        id: eventId,
    });
});

export default router;
