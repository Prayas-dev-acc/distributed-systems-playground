-- Scenario 1: Race Conditions & Distributed Locking
CREATE TABLE IF NOT EXISTS counter (
  id INTEGER PRIMARY KEY DEFAULT 1,
  value INTEGER NOT NULL DEFAULT 0
);
INSERT INTO counter (id, value) VALUES (1, 0) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  owner VARCHAR(50) NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scenario 2: UNKNOWN Errors & Idempotency
CREATE TABLE IF NOT EXISTS transfer_requests (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(100) UNIQUE NOT NULL,
  from_account_id INTEGER NOT NULL,
  to_account_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  server_id VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scenario 3: Network Partitions / Split Brain
CREATE TABLE IF NOT EXISTS cluster_state (
  node_id VARCHAR(50) PRIMARY KEY,
  is_leader BOOLEAN NOT NULL DEFAULT FALSE,
  last_heartbeat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  partition_group INTEGER NOT NULL DEFAULT 0
);

-- Scenario 4: Eventual Consistency
CREATE TABLE IF NOT EXISTS primary_data (
  id INTEGER PRIMARY KEY DEFAULT 1,
  value TEXT NOT NULL DEFAULT 'initial_value',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO primary_data (id, value) VALUES (1, 'initial_value') ON CONFLICT DO NOTHING;

-- Scenario 5: Health Checks
CREATE TABLE IF NOT EXISTS request_log (
  id SERIAL PRIMARY KEY,
  server_id VARCHAR(50) NOT NULL,
  path VARCHAR(255) NOT NULL,
  status_code INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed data
INSERT INTO accounts (owner, balance) VALUES
  ('Account A', 1000),
  ('Account B', 500)
ON CONFLICT (owner) DO NOTHING;

