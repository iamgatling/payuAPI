export interface Payment {
    payment_id: string;
    amount: number;
    status: 'pending' | 'processing' | 'processed' | 'failed' | 'failed_permanent';
    user: string;
    receivedAt: string;
    updatedAt: string;
}
