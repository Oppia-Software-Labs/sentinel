-- registered_agents.agent_id was globally unique, which prevents two users
-- from having agents with the same id (e.g. both having "risk").
-- Replace with a (owner_id, agent_id) composite unique constraint.
--
-- agent_configs has a FK referencing registered_agents(agent_id); drop it
-- first, then re-add it as a composite FK on (owner_id, agent_id).

-- 1. Drop the dependent FK on agent_configs
alter table agent_configs drop constraint if exists agent_configs_agent_id_fkey;

-- 2. Drop the global unique constraint
alter table registered_agents drop constraint if exists registered_agents_agent_id_key;

-- 3. Add composite unique so (owner_id, agent_id) is the natural key
alter table registered_agents add constraint registered_agents_owner_agent_unique unique (owner_id, agent_id);

-- 4. Re-add FK on agent_configs using the composite key (agent_configs already has owner_id)
alter table agent_configs add constraint agent_configs_owner_agent_fkey
  foreign key (owner_id, agent_id) references registered_agents(owner_id, agent_id) on delete cascade;
