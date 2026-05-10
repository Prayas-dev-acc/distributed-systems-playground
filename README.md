# Distributed Systems Playground

Interactive web app that visualizes distributed systems concepts in real time.

## Architecture

```
frontend (Vite + React + Tailwind)  :5173
    │
    ├── backend-1 (Express + Socket.io)  :3001
    ├── backend-2 (Express + Socket.io)  :3002
    └── backend-3 (Express + Socket.io)  :3003
            │
            ├── PostgreSQL  :5432  (shared state)
            └── Redis       :6379  (locks, counters)
```

## Scenarios

| # | Scenario | Concepts |
|---|----------|---------|
| 1 | Race Conditions & Distributed Locking | Optimistic locking, Redis SETNX, lost updates |
| 2 | UNKNOWN Errors & Idempotency | Idempotency keys, at-least-once delivery |
| 3 | Network Partitions & Split Brain | Leader election, partition groups |
| 4 | Eventual Consistency & Replication Lag | Read-your-writes, monotonic reads |
| 5 | Load Balancing & Health Checks | Round-robin, circuit breakers, health endpoints |

## Quick Start

```bash
docker compose up --build
```

Then open http://localhost:5173

## Development (without Docker)

### Backend

```bash
cd backend
npm install
# Run each server in a separate terminal:
PORT=3001 SERVER_ID=server-1 DATABASE_URL=postgresql://... REDIS_URL=redis://localhost:6379 npm run dev
PORT=3002 SERVER_ID=server-2 DATABASE_URL=postgresql://... REDIS_URL=redis://localhost:6379 npm run dev
PORT=3003 SERVER_ID=server-3 DATABASE_URL=postgresql://... REDIS_URL=redis://localhost:6379 npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## API Reference

Every server exposes:

- `GET /health` — liveness + readiness with db/redis checks
- `GET /info` — server ID, port, PID
- `GET /scenarios/:name/*` — scenario-specific routes
- WebSocket — real-time request logs and scenario events
