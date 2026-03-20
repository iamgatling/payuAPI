export const logger = {
    info(context: string, message: string, meta?: any) {
        console.log(JSON.stringify({
            level: 'INFO',
            timestamp: new Date().toISOString(),
            context,
            message,
            ...meta
        }));
    },
    warn(context: string, message: string, meta?: any) {
        console.warn(JSON.stringify({
            level: 'WARN',
            timestamp: new Date().toISOString(),
            context,
            message,
            ...meta
        }));
    },
    error(context: string, message: string, error?: any) {
        console.error(JSON.stringify({
            level: 'ERROR',
            timestamp: new Date().toISOString(),
            context,
            message,
            error: error instanceof Error ? { message: error.message, stack: error.stack } : error
        }));
    }
};
