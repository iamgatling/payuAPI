import { db } from './db';
import { WebhookEvent } from './types';

export const eventStore = {
  async get(id: string): Promise<WebhookEvent | undefined> {
    const record = await db('events').where({ id }).first();
    if (record && typeof record.payload === 'string') {
        try {
            record.payload = JSON.parse(record.payload);
        } catch (e) {
            
        }
    }
    return record as WebhookEvent | undefined;
  },
  
  async set(event: WebhookEvent): Promise<void> {
    const existing = await this.get(event.id);
    const dbEvent = {
        ...event,
        payload: typeof event.payload === 'string' ? event.payload : JSON.stringify(event.payload)
    };

    if (existing) {
      await db('events').where({ id: event.id }).update(dbEvent);
    } else {
      await db('events').insert(dbEvent);
      await db('status_history').insert({
        event_id: event.id,
        status: event.status,
        timestamp: event.updatedAt
      });
    }
  },
  
  async updateStatus(id: string, status: string, updatedAt: string): Promise<void> {
    await db('events').where({ id }).update({ status, updatedAt });
    await db('status_history').insert({
      event_id: id,
      status,
      timestamp: updatedAt
    });
  },
  
  async getAll(): Promise<WebhookEvent[]> {
    const records = await db('events').select('*');
    return records.map((record) => {
        const event = record as WebhookEvent;
        if (typeof event.payload === 'string') {
            try {
                event.payload = JSON.parse(event.payload);
            } catch (e) {}
        }
        return event;
    });
  },
  
  async getPaginated(page: number, limit: number): Promise<{ data: WebhookEvent[], meta: { total: number, page: number, limit: number, totalPages: number } }> {
    const offset = (page - 1) * limit;
    const [countResult] = await db('events').count('* as count');
    const total = Number(countResult.count);

    const records = await db('events')
      .select('*')
      .orderBy('receivedAt', 'desc')
      .limit(limit)
      .offset(offset);

    const data = records.map((record) => {
        const event = record as WebhookEvent;
        if (typeof event.payload === 'string') {
            try {
                event.payload = JSON.parse(event.payload);
            } catch (e) {}
        }
        return event;
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  },
  
  async getHistory(eventId: string): Promise<any[]> {
    return db('status_history').where({ event_id: eventId }).orderBy('timestamp', 'asc');
  },

  async getDeadLetters(): Promise<WebhookEvent[]> {
    const records = await db('events').where({ status: 'failed_permanent' }).orderBy('updatedAt', 'desc');
    return records.map((record) => {
        const event = record as WebhookEvent;
        if (typeof event.payload === 'string') {
            try {
                event.payload = JSON.parse(event.payload);
            } catch (e) {}
        }
        return event;
    });
  },

  async delete(id: string): Promise<void> {
    await db('events').where({ id }).del();
    
    await db('status_history').where({ event_id: id }).del();
  }
};

export default eventStore;
