-- Notification configs and delivery logs for webhook + email channels

create table notification_configs (
  id         uuid    primary key default gen_random_uuid(),
  owner_id   text    not null,
  type       text    not null check (type in ('webhook', 'email')),
  config     jsonb   not null,
  -- webhook: { url: string, secret?: string }
  -- email:   { to: string, from?: string, api_key: string }
  enabled    boolean default true,
  events     text[]  default array[
    'transaction_blocked',
    'transaction_settled',
    'kill_switch_triggered'
  ],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table notification_logs (
  id          uuid primary key default gen_random_uuid(),
  config_id   uuid references notification_configs(id) on delete cascade,
  event_type  text not null,
  payload     jsonb,
  status      text check (status in ('sent', 'failed')),
  error       text,
  created_at  timestamptz default now()
);

create index on notification_configs (owner_id);
create index on notification_logs (config_id, created_at desc);

alter table notification_configs enable row level security;
alter table notification_logs enable row level security;

alter publication supabase_realtime add table notification_logs;
