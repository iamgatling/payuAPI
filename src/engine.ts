import { WebhookEvent } from './types';
import { logger } from './logger';

export type EventHandler = (event: WebhookEvent) => Promise<void>;

class HookrunnerEngine {
    private handlers: Map<string, EventHandler> = new Map();

        register(eventType: string, handler: EventHandler): void {
        if (this.handlers.has(eventType)) {
            logger.warn('Engine', `Overwriting existing handler for eventType: ${eventType}`);
        }
        this.handlers.set(eventType, handler);
        logger.info('Engine', `Registered handler for ${eventType}`);
    }

        getHandler(eventType: string): EventHandler | undefined {
        return this.handlers.get(eventType);
    }
}

export const engine = new HookrunnerEngine();
