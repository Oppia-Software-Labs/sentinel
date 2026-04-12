-- Hosted agent configurations (LLM provider, encrypted API key, system prompt)
-- Used by /api/agents/hosted to call LLM providers on behalf of users

create table agent_configs (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null references registered_agents(agent_id) on delete cascade,
  owner_id text not null,
  provider text not null check (provider in ('openai', 'anthropic')),
  api_key_encrypted text not null,
  model text not null,
  system_prompt text not null,
  temperature numeric(3,2) default 0.0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index on agent_configs (agent_id);
create index on agent_configs (owner_id);

-- Update registered_agents type constraint to allow 'hosted'
alter table registered_agents drop constraint if exists registered_agents_type_check;
alter table registered_agents add constraint registered_agents_type_check
  check (type in ('shieldpay', 'custom', 'hosted'));

-- RLS
alter table agent_configs enable row level security;

-- Realtime
alter publication supabase_realtime add table agent_configs;
