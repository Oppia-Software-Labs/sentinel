-- Allow the anon role to SELECT all tables (no auth for MVP dashboard)
-- Supabase Realtime also respects RLS — without these policies,
-- realtime subscriptions silently return nothing for the anon key.

create policy "anon read transactions"  on transactions      for select using (true);
create policy "anon read votes"         on votes             for select using (true);
create policy "anon read mpp_sessions"  on mpp_sessions      for select using (true);
create policy "anon read policies"      on policies          for select using (true);
create policy "anon read agents"        on registered_agents for select using (true);
create policy "anon read consensus"     on consensus_config  for select using (true);

-- Add tables that were missing from the initial realtime publication
alter publication supabase_realtime add table policies, registered_agents;
