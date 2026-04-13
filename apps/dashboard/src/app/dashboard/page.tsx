import { createServerSupabaseClient } from '@/lib/supabase/server'
import { StatsCards } from '@/components/StatsCards'
import { TransactionsTable } from '@/components/TransactionsTable'
import { KillSwitchButton } from '@/components/KillSwitchButton'
import type { Transaction } from '@/types'

export default async function DashboardPage() {
  let transactions: Transaction[] = []
  let activeSessionCount = 0
  let agentCount = 0

  try {
    const supabase = await createServerSupabaseClient()

    const [txResult, sessionResult, agentResult] = await Promise.all([
      supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('mpp_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase
        .from('registered_agents')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true),
    ])

    transactions = (txResult.data ?? []) as Transaction[]
    activeSessionCount = sessionResult.count ?? 0
    agentCount = agentResult.count ?? 0
  } catch {
    // Supabase not configured yet — render empty state
  }

  return (
    <div className="p-6 space-y-5">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl" style={{ height: '200px' }}>
        {/* Background image — filter applied here only, not to text */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/hero/hero.svg')",
            filter: 'brightness(0.8)',
          }}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 65%)', zIndex: 0 }} />
        {/* Text content */}
        <div className="relative z-10 flex h-full flex-col justify-center px-8">
          <span className="mb-2 inline-flex w-fit items-center rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/80">
            Sentinel
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white">Overview</h2>
          <p className="mt-1 text-sm text-white/70">Real-time payment governance for autonomous AI agents</p>
        </div>
      </div>

      <div className="flex justify-end">
        <KillSwitchButton initialSessionCount={activeSessionCount} />
      </div>

      {/* Stats row */}
      <StatsCards
        initialTransactions={transactions}
        initialSessionCount={activeSessionCount}
        initialAgentCount={agentCount}
      />

      {/* Transactions feed */}
      <TransactionsTable initialTransactions={transactions} />
    </div>
  )
}
