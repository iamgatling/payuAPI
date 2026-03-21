import 'dotenv/config';
import http from 'http';
import express, { Request, Response } from 'express';
import intakeRoutes from './routes/intake';
import managementRoutes from './routes/management';
import healthRoutes from './routes/health';
import { initDb } from './db';
import { logger } from './logger';
import { eventQueue, eventWorker } from './services/eventProcessor';


// rawBody extension moved to types.ts




const requiredEnvVars = ['API_KEY', 'WEBHOOK_SECRET', 'REDIS_URL', 'DATABASE_URL'];
const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
    logger.error('Startup', `Missing required environment variables: ${missingVars.join(', ')}`);
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json({
    verify: (req: http.IncomingMessage, _res, buf) => {
        req.rawBody = buf;
    }
}));


app.use(healthRoutes);
app.use(intakeRoutes);
app.use(managementRoutes); 

app.get('/', (_req: Request, res: Response) => {
    res.json({ status: 'ok', message: 'Hookrunner Engine is running' });
});




logger.info('Server', 'Starting application... initializing DB');

let server: http.Server;

initDb().then(() => {
    logger.info('Server', 'DB Initialized');
    server = app.listen(PORT, () => {
        logger.info('Server', `Server listening on http://localhost:${PORT}`);
    });
}).catch(err => {
    logger.error('Server', 'DB Init Error', err);
    process.exit(1);
});




async function shutdown(signal: string) {
    logger.info('Server', `Received ${signal}. Shutting down gracefully...`);
    try {
        if (server) await new Promise<void>((resolve) => server.close(() => resolve()));
        logger.info('Server', 'HTTP server closed.');

        await eventWorker.close();
        logger.info('Server', 'Worker closed.');

        await eventQueue.close();
        logger.info('Server', 'Queue closed.');

        process.exit(0);
    } catch (err) {
        logger.error('Server', 'Error during shutdown', err);
        process.exit(1);
    }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
