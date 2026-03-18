# Webhook + Background Job Demo

Express.js server that handles webhook payment events and processes them asynchronously via simulated background jobs.

## Features

| Feature | Details |
|---|---|
| **Webhook endpoint** | `POST /webhook` — accepts payment JSON, triggers async processing |
| **Status endpoint** | `GET /payments` — returns all payments with live status |
| **Async processing** | Random 3–5 s delay simulating a queue worker |
| **Retry on failure** | 20 % chance of transient failure → automatic retry |
| **Console logging** | Pretty-printed `console.table` after each state change |

## Start

```bash
# Install dependencies
npm install

# Start with auto-reload (development)
npm run dev

# — or plain start —
npm start
```

Server runs on **http://localhost:3000** by default (override with `PORT` env var).

## Testing with curl

### 1. Send a payment event

```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
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
curl http://localhost:3000/payments
```

- **Immediately** → status will be `processing`
- **After ~3–5 s** → status will be `processed` (or `failed → processed` if retry kicked in)

### 3. Send multiple events

```bash
curl -s -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"payment_id":"A001","amount":500,"status":"pending","user":"Alice"}'

curl -s -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"payment_id":"B002","amount":1500,"status":"pending","user":"Bob"}'
```

Each payment is tracked independently — check `/payments` to see all of them.

## Project Structure

```
src/
├── server.js                  # Express app entry point
├── store.js                   # In-memory payment Map
├── routes/
│   └── webhook.js             # POST /webhook  &  GET /payments
└── services/
    └── paymentProcessor.js    # Async processor with retry logic
```
