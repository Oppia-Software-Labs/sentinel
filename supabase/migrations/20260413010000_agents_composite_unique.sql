-- registered_agents.agent_id was globally unique, which prevents two users
-- from having agents with the same id (e.g. both having "risk").
-- Replace with a (owner_id, agent_id) composite unique constraint.

alter table registered_agents drop constraint if exists registered_agents_agent_id_key;
alter table registered_agents add constraint registered_agents_owner_agent_unique unique (owner_id, agent_id);
