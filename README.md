# Webhook + Background Job Demo

Express.js server that handles webhook payment events and processes them asynchronously via BullMQ & Redis, with persistent storage via SQLite/PostgreSQL.

## Features

| Feature | Details |
|---|---|
| **Webhook endpoint** | `POST /webhook` — accepts payment JSON, triggers async processing. Rejects duplicate `payment_id`s (Idempotency). |
| **Signature Verification** | Validates the `X-Webhook-Signature` header using HMAC SHA-256 and a secret. |
| **Status endpoint** | `GET /payments` — returns all payments with live status. Supports pagination (`?page=1&limit=10`). |
| **History endpoint** | `GET /payments/:id/history` — retrieves the status transition history for a specific payment. |
| **Health endpoint** | `GET /health` — returns system uptime, database status, and queue depth. |
| **Async processing** | Powered by **BullMQ** & **Redis**, replacing basic timeouts. Simulates a 3–5s processing delay. |
| **Retry & Backoff** | 20% chance of transient failure. Automatically retries up to 3 times with exponential backoff, eventually marking as `failed_permanent`. |
| **Persistent Storage** | Uses **Knex.js** with **SQLite** in development and **PostgreSQL** in production. |

## Start

### Prerequisites
- Node.js
- Redis running locally or accessible via `REDIS_URL`.

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Setup environment:**
   Copy `.env.example` to `.env` and fill in the values (e.g., `WEBHOOK_SECRET`, `PORT`, `REDIS_URL`).
   ```bash
   cp .env.example .env
   ```
3. **Start the server:**
   ```bash
   npm run dev  # Starts with auto-reload
   # — or —
   npm start
   ```

Server runs on **http://localhost:3000** by default.

## Testing with curl

### 1. Send a payment event

```bash
# Generate the appropriate X-Webhook-Signature using HMAC SHA256 of the raw body and your WEBHOOK_SECRET.
# For testing, ensure you use the exact raw body string.

curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: <your_signature_here>" \
  -d '{"payment_id":"12345","amount":2000,"status":"pending","user":"David"}'
```

Expected response (`202 Accepted`):

```json
{
  "message": "Payment event received — processing in background",
  "payment_id": "12345"
}
```

### 2. Check payment status

```bash
curl "http://localhost:3000/payments?page=1&limit=5"
```

- **Immediately** → status will be `processing`
- **After ~3–5 s** → status will be `processed` (or `failed` → retrying, or `failed_permanent`).

### 3. Check payment history

```bash
curl http://localhost:3000/payments/12345/history
```
Returns a list of all status changes for the given payment ID.

### 4. Check system health

```bash
curl http://localhost:3000/health
```

## Project Structure

```text
src/
├── server.ts                  # Express app entry point
├── store.ts                   # Store wrappers for DB interactions
├── db.ts                      # Knex.js DB connection & initialization
├── types.ts                   # TypeScript interfaces
├── routes/
│   ├── webhook.ts             # POST /webhook, GET /payments, GET /payments/:id/history
│   └── health.ts              # GET /health endpoint
└── services/
    └── paymentProcessor.ts    # BullMQ worker & queue configuration
```
