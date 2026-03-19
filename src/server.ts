import express, { Request, Response } from 'express';
import webhookRoutes from './routes/webhook';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(webhookRoutes);

app.get('/', (_req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Webhook + Background Job Demo is running ' });
});

app.listen(PORT, () => {
    console.log(`\n Server listening on http://localhost:${PORT}`);
    console.log('   POST /webhook   — send a payment event');
    console.log('   GET  /payments  — list all payments\n');
});
