-- Sentinel + ShieldPay — Supabase Schema (mirror for dashboard)
-- Source of truth is the Soroban contract; these tables are read-optimized mirrors.

-- Policies (spending rules per owner)
create table policies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  rules jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Registered agents (shieldpay built-in + custom)
create table registered_agents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  agent_id text not null unique,
  type text not null check (type in ('shieldpay', 'custom')),
  endpoint text,
  description text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Consensus configuration per owner
create table consensus_config (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique,
  quorum text default 'majority' check (quorum in ('majority', 'unanimous', 'any')),
  timeout_ms integer default 5000,
  agents jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Transaction log
create table transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  agent_id text not null,
  amount numeric(20,10) not null,
  asset_code text default 'USDC',
  vendor text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected', 'settled')),
  consensus_result text check (consensus_result in ('approved', 'rejected', 'timeout')),
  policy_decision text check (policy_decision in ('approved', 'rejected')),
  escrow_contract_id text,
  tx_hash text,
  soroban_tx_id text,
  error text,
  created_at timestamptz default now()
);

-- Votes per transaction
create table votes (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references transactions(id) on delete cascade,
  agent_id text not null,
  decision text not null check (decision in ('approve', 'reject')),
  reason text,
  latency_ms integer,
  created_at timestamptz default now()
);

-- MPP sessions
create table mpp_sessions (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  owner_id uuid not null,
  agent_id text not null,
  total_charged numeric(20,10) default 0,
  status text default 'active' check (status in ('active', 'closed', 'killed')),
  kill_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index on transactions (owner_id, created_at desc);
create index on transactions (agent_id, created_at desc);
create index on transactions (soroban_tx_id);
create index on votes (transaction_id);
create index on mpp_sessions (owner_id, status);

-- Realtime
alter publication supabase_realtime add table transactions, votes, mpp_sessions, consensus_config;

-- RLS (enabled but no policies for MVP — service_role_key bypasses)
alter table policies enable row level security;
alter table registered_agents enable row level security;
alter table consensus_config enable row level security;
alter table transactions enable row level security;
alter table votes enable row level security;
alter table mpp_sessions enable row level security;
