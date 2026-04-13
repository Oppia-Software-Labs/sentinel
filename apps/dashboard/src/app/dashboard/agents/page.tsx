import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/supabase/session'
import { AgentsList } from '@/components/AgentsList'
import type { RegisteredAgent } from '@/types'

export default async function AgentsPage() {
  const session = await getSessionUser()
  if (!session) redirect('/onboarding')

  const { ownerId } = session
  let agents: RegisteredAgent[] = []

  try {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase
      .from('registered_agents')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })

    agents = (data ?? []) as RegisteredAgent[]
  } catch {
    // Supabase not configured — render empty state
  }

  return (
    <div className="p-6 space-y-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl" style={{ height: '200px' }}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/hero/hero2.jpeg')",
            filter: 'brightness(0.8)',
          }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 65%)', zIndex: 0 }} />
        <div className="relative z-10 flex h-full flex-col justify-center px-8">
          <span className="mb-2 inline-flex w-fit items-center rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/80">
            Sentinel
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white">Agents</h2>
          <p className="mt-1 text-sm text-white/70">Voting agents registered on-chain with quorum-based approval</p>
        </div>
      </div>

      <AgentsList initialAgents={agents} />
    </div>
  )
}
