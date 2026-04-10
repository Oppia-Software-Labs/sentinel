-- Sentinel + ShieldPay — initial schema (Supabase)
-- Source: team migration / SQL editor

-- Spending rules per owner
create table policies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  rules jsonb not null,
  -- { max_per_task: 5, max_per_hour: 50, max_per_day: 200,
  --   blocked_vendors: [], alert_threshold: 10 }
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Registered agents (ShieldPay built-in + user-defined)
create table registered_agents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  agent_id text not null unique,
  type text not null check (type in ('shieldpay', 'custom')),
  endpoint text,                   -- Custom agent HTTP URL (only when type = 'custom')
  description text,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Consensus settings per owner
create table consensus_config (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique,
  quorum text default 'majority' check (quorum in ('majority', 'unanimous', 'any')),
  timeout_ms integer default 5000,
  agents jsonb not null default '[]',  -- JSON array of agent_id strings
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Transaction audit log
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
  escrow_contract_id text,             -- Trustless Work contract id (set by ShieldPay)
  tx_hash text,
  error text,
  created_at timestamptz default now()
);

-- Per-transaction votes
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
create index on votes (transaction_id);
create index on mpp_sessions (owner_id, status);

-- Realtime
alter publication supabase_realtime add table transactions, votes, mpp_sessions, consensus_config;

-- RLS
alter table policies enable row level security;
alter table registered_agents enable row level security;
alter table consensus_config enable row level security;
alter table transactions enable row level security;
alter table votes enable row level security;
alter table mpp_sessions enable row level security;

-- Note: RLS is enabled with no policies in this migration. service_role (API / SDK) bypasses RLS.
-- For the dashboard with the anon key, add policies in a follow-up migration or the SQL editor.
