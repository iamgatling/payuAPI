import 'dotenv/config';
import express, { Request, Response } from 'express';
import webhookRoutes from './routes/webhook';
import healthRoutes from './routes/health';
import { initDb } from './db';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({
    verify: (req: any, _res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(webhookRoutes);
app.use(healthRoutes);

app.get('/', (_req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Webhook + Background Job Demo is running ' });
});

console.log(' [Server] Starting application... initializing DB');
initDb().then(() => {
    console.log(' [Server] DB Initialized');
    app.listen(PORT, () => {
        console.log(`\n Server listening on http://localhost:${PORT}`);
        console.log('   POST /webhook   — send a payment event');
        console.log('   GET  /payments  — list all payments\n');
    });
}).catch(err => {
    console.error(' [Server] DB Init Error:', err);
});
