import 'http';

declare module 'http' {
    interface IncomingMessage {
        rawBody?: Buffer;
    }
}

export interface WebhookEvent {
    id: string;
    source: string;
    eventType: string;
    reference: string;
    status: string;
    payload: Record<string, unknown>;
    receivedAt: string;
    updatedAt: string;
}
