import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import eventStore from '../eventStore';
import { engine } from '../engine';
import { logger } from '../logger';


const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const maxAttempts = parseInt(process.env.JOB_MAX_ATTEMPTS || '3', 10);
const backoffDelay = parseInt(process.env.JOB_BACKOFF_DELAY_MS || '1000', 10);
const concurrency = parseInt(process.env.WORKER_CONCURRENCY || '5', 10);

const redisConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });

export const eventQueue = new Queue('events', { connection: redisConnection as any });

export async function processEvent(eventId: string): Promise<void> {
    logger.info('Processor', `Queued event ${eventId} in BullMQ`);

    await eventQueue.add('process-event', { eventId }, {
        attempts: maxAttempts,
        backoff: {
            type: 'exponential',
            delay: backoffDelay,
        }
    });
}

export const eventWorker = new Worker('events', async (job: Job) => {
    const { eventId } = job.data;
    
    logger.info('Processor', `Worker processing start for event ${eventId}`);

    const event = await eventStore.get(eventId);
    if (!event) {
        logger.warn('Processor', `Event ${eventId} not found in store. Skipping.`);
        return;
    }

    const handler = engine.getHandler(event.eventType);
    if (!handler) {
        logger.info('Processor', `No handler registered for event type ${event.eventType}. Discarding event ${eventId}.`);
        await eventStore.updateStatus(eventId, 'discarded', new Date().toISOString());
        return;
    }

    await eventStore.updateStatus(eventId, 'processing', new Date().toISOString());

    
    try {
        await handler(event);
        await eventStore.updateStatus(eventId, 'processed', new Date().toISOString());
        logger.info('Processor', `Event ${eventId} PROCESSED successfully`);
    } catch (err) {
        
        throw err;
    }
}, { 
    connection: redisConnection as any,
    concurrency
});

eventWorker.on('failed', async (job: Job | undefined, err: Error) => {
    if (!job) return;
    const { eventId } = job.data;

    logger.error('Processor', `Event ${eventId} FAILED (Attempt ${job.attemptsMade}) - ${err.message}`);

    
    const attempts = job.opts.attempts || maxAttempts;
    if (job.attemptsMade >= attempts) {
        await eventStore.updateStatus(eventId, 'failed_permanent', new Date().toISOString());
        logger.error('Processor', `Event ${eventId} FAILED PERMANENTLY after ${job.attemptsMade} retries`);
    } else {
        await eventStore.updateStatus(eventId, 'failed', new Date().toISOString());
        logger.warn('Processor', `Event ${eventId} FAILED — BullMQ will schedule retry…`);
    }
});
