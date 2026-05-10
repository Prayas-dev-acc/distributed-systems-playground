# Distributed Systems Playground

Interactive visualization of distributed systems concepts — race conditions, network partitions, idempotency, replication lag, and load balancing — running across 3 real backend nodes with PostgreSQL and Redis.

> **Infrastructure runs on-demand.** The 3 backends + database + cache are spun up for demos and torn down after. [Request a live demo](https://github.com/Prayas-dev-acc/distributed-systems-playground) or run it locally in 30 seconds.

## Quick Start (Local)

```bash
git clone https://github.com/Prayas-dev-acc/distributed-systems-playground
cd distributed-systems-playground
docker-compose up
# Open http://localhost:5173
```

## What This Demonstrates

### 1. ⚡ Race Conditions & Distributed Locking
100 concurrent requests increment a shared counter. Without a Redis lock, writes silently overwrite each other (lost updates). With `SET NX EX` locking, every increment is serialized — always exact.

### 2. 🔁 UNKNOWN Errors & Idempotency
A payment request times out mid-flight. Did it succeed? With idempotency keys the answer is always "retry safely" — the server deduplicates using a unique request ID and returns the original result.

### 3. 🔀 Network Partitions & Split Brain
One server gets isolated. The healthy majority elects a new leader via Raft-like voting with term numbers. The partitioned node keeps accepting writes — creating a split brain until partition heals.

### 4. ⏳ Eventual Consistency & Replication Lag
Write to the primary. Replicas receive updates asynchronously via Redis pub/sub. During the lag window, reading from a replica returns stale data — this is an AP system (like DynamoDB, Cassandra).

### 5. ⚖️ Load Balancing & Health Checks
Kill a backend mid-traffic. The load balancer detects failure via health checks, stops routing there, and redistributes load. Revive it — it rejoins the rotation automatically on the next check cycle.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, Tailwind CSS, Socket.io client |
| Backend | Node.js (ESM), Express, Socket.io |
| Database | PostgreSQL (counters, idempotency keys, replication state) |
| Cache | Redis (distributed locks, pub/sub, leader election) |
| Infra | Docker, Docker Compose |

## Architecture

```
Browser (React + Socket.io)
         │
    HTTP + WebSocket
         │
┌────────┼────────┬────────┐
│ backend-1:3001  │ backend-2:3002 │ backend-3:3003 │
└────────┼────────┴────────┘
         │
    shared state
         │
┌────────┴────────┐
│  PostgreSQL     │  Redis           │
│  :5432          │  :6379           │
└─────────────────┴──────────────────┘
```

## Interview Questions This Answers

- ✅ **What is the CAP theorem?** — Scenario 4 is a live AP system; Scenario 3 is CP
- ✅ **How do you handle race conditions?** — Scenario 1: Redis SETNX distributed lock
- ✅ **Explain idempotency and why it matters** — Scenario 2: dedup via unique request IDs
- ✅ **What happens during a network partition?** — Scenario 3: leader election in real-time
- ✅ **How does replication work? What is eventual consistency?** — Scenario 4: async pub/sub lag
- ✅ **How do you implement load balancing and failover?** — Scenario 5: health-check routing

## Development (without Docker)

### Backend (run 3 terminals)

```bash
cd backend && npm install

# Terminal 1
PORT=3001 SERVER_ID=server-1 DATABASE_URL=postgresql://postgres:postgres@localhost:5432/distributed_systems REDIS_URL=redis://localhost:6379 node src/server.js

# Terminal 2
PORT=3002 SERVER_ID=server-2 DATABASE_URL=... REDIS_URL=... node src/server.js

# Terminal 3
PORT=3003 SERVER_ID=server-3 DATABASE_URL=... REDIS_URL=... node src/server.js
```

### Frontend

```bash
cd frontend && npm install && npm run dev
```

Copy `frontend/.env.example` → `frontend/.env` and fill in backend URLs if deploying.

## API Reference

Every backend exposes:

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Liveness check with DB + Redis status |
| `GET /info` | Server ID, port, PID |
| `GET/POST /scenarios/race-conditions/*` | Counter + locking endpoints |
| `GET/POST /scenarios/idempotency/*` | Transfer + dedup endpoints |
| `GET/POST /scenarios/partitions/*` | Leader election + partition endpoints |
| `GET/POST /scenarios/replication/*` | Primary/replica read-write endpoints |
| `GET/POST /scenarios/load-balancing/*` | Health + kill/restart endpoints |
| WebSocket | Real-time request logs and scenario events |

## Built By

**Prayas Jain** — Full stack engineer with focus on distributed systems and backend infrastructure.

[GitHub](https://github.com/Prayas-dev-acc/distributed-systems-playground)
