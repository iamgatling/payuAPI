import { db } from './db';
import { Payment } from './types';

export const paymentsStore = {
  async get(id: string): Promise<Payment | undefined> {
    return db('payments').where({ payment_id: id }).first();
  },
  async set(payment: Payment): Promise<void> {
    const existing = await this.get(payment.payment_id);
    if (existing) {
      await db('payments').where({ payment_id: payment.payment_id }).update(payment);
    } else {
      await db('payments').insert(payment);
      await db('status_history').insert({
        payment_id: payment.payment_id,
        status: payment.status,
        timestamp: payment.updatedAt
      });
    }
  },
  async updateStatus(id: string, status: string, updatedAt: string): Promise<void> {
    await db('payments').where({ payment_id: id }).update({ status, updatedAt });
    await db('status_history').insert({
      payment_id: id,
      status,
      timestamp: updatedAt
    });
  },
  async getAll(): Promise<Payment[]> {
    return db('payments').select('*');
  },
  async getPaginated(page: number, limit: number): Promise<{ data: Payment[], meta: { total: number, page: number, limit: number, totalPages: number } }> {
    const offset = (page - 1) * limit;
    const [countResult] = await db('payments').count('* as count');
    const total = Number(countResult.count);

    const data = await db('payments')
      .select('*')
      .orderBy('receivedAt', 'desc')
      .limit(limit)
      .offset(offset);

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
  async getHistory(paymentId: string): Promise<any[]> {
    return db('status_history').where({ payment_id: paymentId }).orderBy('timestamp', 'asc');
  }
};

export default paymentsStore;
