-- owner_id across all tables stores Stellar public keys (G...), not UUIDs.
-- Changing all owner_id columns from uuid to text.

alter table policies alter column owner_id type text using owner_id::text;
alter table registered_agents alter column owner_id type text using owner_id::text;
alter table consensus_config alter column owner_id type text using owner_id::text;
alter table transactions alter column owner_id type text using owner_id::text;
