import { Router, Request, Response, NextFunction } from 'express';
import eventStore from '../eventStore';
import { processEvent } from '../services/eventProcessor';
import { logger } from '../logger';

const router = Router();


function requireApiKey(req: Request, res: Response, next: NextFunction): any {
    const authHeader = req.headers.authorization;
    const apiKey = process.env.API_KEY;

    if (!apiKey) {
        logger.error('Management', 'API_KEY is not configured on the server.');
        return res.status(500).json({ error: 'Server configuration error' });
    }

    if (!authHeader || authHeader !== `Bearer ${apiKey}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
}

router.use(requireApiKey);


router.get('/events', async (req: Request, res: Response): Promise<any> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (page < 1 || limit < 1 || limit > 100) {
        return res.status(400).json({ error: 'Invalid page or limit parameters. Limit must be between 1 and 100.' });
    }

    const result = await eventStore.getPaginated(page, limit);
    return res.json(result);
});


router.get('/events/:id/history', async (req: Request, res: Response): Promise<any> => {
    const id = typeof req.params.id === 'string' ? req.params.id : String(req.params.id);
    const history = await eventStore.getHistory(id);
    return res.json({ id, history });
});


router.get('/jobs/dead', async (_req: Request, res: Response): Promise<any> => {
    const deadLetters = await eventStore.getDeadLetters();
    return res.json({ deadLetters });
});


router.post('/jobs/:id/retry', async (req: Request, res: Response): Promise<any> => {
    const id = typeof req.params.id === 'string' ? req.params.id : String(req.params.id);
    const event = await eventStore.get(id);

    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status !== 'failed_permanent') {
        return res.status(400).json({ error: 'Event is not in failed_permanent state' });
    }

    logger.info('Management', `Manually retrying event ${id}`);
    await eventStore.updateStatus(id, 'pending', new Date().toISOString());
    await processEvent(id);

    return res.json({ message: 'Event successfully requeued', id });
});


router.delete('/jobs/:id', async (req: Request, res: Response): Promise<any> => {
    const id = typeof req.params.id === 'string' ? req.params.id : String(req.params.id);
    const event = await eventStore.get(id);

    if (!event) {
        return res.status(404).json({ error: 'Event not found' });
    }

    if (event.status !== 'failed_permanent') {
        return res.status(400).json({ error: 'Event is not in failed_permanent state. Only permanently failed jobs can be discarded.' });
    }

    logger.info('Management', `Manually discarding dead letter event ${id}`);
    await eventStore.delete(id);

    return res.json({ message: 'Event successfully discarded', id });
});

export default router;
