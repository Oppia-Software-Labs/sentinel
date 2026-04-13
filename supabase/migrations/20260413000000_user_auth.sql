-- ── User identity: one row per Supabase Auth user ────────────────────────────
-- owner_id is a Stellar public key (G...) generated client-side on first login.
-- The platform operator secret signs all Soroban txs; users never need their own.

create table user_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  owner_id   text not null unique,          -- Stellar G-address
  created_at timestamptz default now()
);

alter table user_profiles enable row level security;
create policy "users manage own profile"
  on user_profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── API keys ──────────────────────────────────────────────────────────────────
-- Raw key shown once to user, never stored. Only the sha256 hex hash is kept.
-- prefix = first 8 chars of the raw key, shown in the UI for identification.

create table api_keys (
  id         uuid primary key default gen_random_uuid(),
  owner_id   text not null references user_profiles(owner_id) on delete cascade,
  key_hash   text not null unique,          -- sha256(raw_key) hex
  prefix     text not null,                 -- first 8 chars of raw key
  label      text,
  created_at timestamptz default now()
);

alter table api_keys enable row level security;
create policy "users manage own api keys"
  on api_keys for all
  using  (owner_id = (select owner_id from user_profiles where id = auth.uid()))
  with check (owner_id = (select owner_id from user_profiles where id = auth.uid()));

-- Allow the service role to look up keys for auth (no RLS bypass needed; service role bypasses RLS)
-- No additional policy required for service-role reads.
