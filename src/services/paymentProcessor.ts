import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import payments from '../store';
import { Payment } from '../types';

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null });

export const paymentQueue = new Queue('payments', { connection: redisConnection as any });

export async function processPayment(paymentId: string): Promise<void> {
    console.log(` [Processor] Queued payment ${paymentId} in BullMQ`);

    await paymentQueue.add('process-payment', { paymentId }, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        }
    });
}

export const paymentWorker = new Worker('payments', async (job: Job) => {
    const { paymentId } = job.data;

    const delay = Math.floor(Math.random() * 2000) + 3000;
    console.log(` [Processor] Worker processing payment ${paymentId} — simulated delay ${delay}ms`);
    
    await new Promise(resolve => setTimeout(resolve, delay));

    let payment = await payments.get(paymentId);
    if (!payment) return;

    await payments.updateStatus(paymentId, 'processing', new Date().toISOString());

    if (Math.random() < 0.2) {
        throw new Error(`Simulated payment processing failure for ${paymentId}`);
    }

    await payments.updateStatus(paymentId, 'processed', new Date().toISOString());
    console.log(` [Processor] Payment ${paymentId} PROCESSED successfully`);
    await logTable();
}, { connection: redisConnection as any });

paymentWorker.on('failed', async (job: Job | undefined, err: Error) => {
    if (!job) return;
    const { paymentId } = job.data;

    console.log(` [Processor] Payment ${paymentId} FAILED (Attempt ${job.attemptsMade}) - ${err.message}`);

    const maxAttempts = job.opts.attempts || 3;
    if (job.attemptsMade >= maxAttempts) {
        await payments.updateStatus(paymentId, 'failed_permanent', new Date().toISOString());
        console.log(` [Processor] Payment ${paymentId} FAILED PERMANENTLY after ${job.attemptsMade} retries`);
    } else {
        await payments.updateStatus(paymentId, 'failed', new Date().toISOString());
        console.log(` [Processor] Payment ${paymentId} FAILED — BullMQ will schedule retry…`);
    }
    await logTable();
});

async function logTable(): Promise<void> {
    const all = await payments.getAll();
    const rows = all.map((p: Payment) => ({
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
