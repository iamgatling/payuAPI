import { Router, Request, Response } from 'express';
import { db } from '../db';
import { paymentQueue } from '../services/paymentProcessor';

const router = Router();

router.get('/health', async (_req: Request, res: Response): Promise<any> => {
    let dbStatus = 'ok';
    try {
        await db.raw('select 1');
    } catch (e) {
        dbStatus = 'error';
    }

    let queueDepth: any = {};
    try {
        queueDepth = await Promise.race([
            paymentQueue.getJobCounts(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1000))
        ]);
    } catch (e) {
        queueDepth = { error: 'Failed to fetch queue depth' };
    }

    return res.json({
        uptime: process.uptime(),
        db: dbStatus,
        queue: queueDepth,
        timestamp: new Date().toISOString()
    });
});

export default router;
