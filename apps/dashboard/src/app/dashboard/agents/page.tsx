import { createServerSupabaseClient } from '@/lib/supabase/server'
import { AgentsList } from '@/components/AgentsList'
import type { RegisteredAgent } from '@/types'

export default async function AgentsPage() {
  let agents: RegisteredAgent[] = []

  try {
    const supabase = await createServerSupabaseClient()
    const ownerId  = process.env.NEXT_PUBLIC_OWNER_ID

    if (ownerId) {
      const { data } = await supabase
        .from('registered_agents')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })

      agents = (data ?? []) as RegisteredAgent[]
    }
  } catch {
    // Supabase not configured — render empty state
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-base font-semibold tracking-tight">Agents</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Voting agents registered on-chain. Each receives a{' '}
          <span className="font-mono">POST</span> with the payment intent and
          responds <span className="font-mono">approve</span> /{' '}
          <span className="font-mono">reject</span>. Quorum decides the verdict.
        </p>
      </div>

      <div className="border-t border-border" />

      <AgentsList initialAgents={agents} />
    </div>
  )
}
