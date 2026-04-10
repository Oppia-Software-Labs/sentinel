-- Add UNIQUE constraint on policies.owner_id so that mirrorPolicy()'s
-- upsert with onConflict: 'owner_id' actually triggers an UPDATE instead
-- of silently inserting duplicate rows.
--
-- If duplicate rows already exist, keep only the most recent one first.
delete from policies p1
using policies p2
where p1.owner_id = p2.owner_id
  and p1.created_at < p2.created_at;

alter table policies add constraint policies_owner_id_key unique (owner_id);
