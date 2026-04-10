-- owner_id in mpp_sessions stores Stellar public keys (G...), not UUIDs
alter table mpp_sessions
  alter column owner_id type text using owner_id::text;
