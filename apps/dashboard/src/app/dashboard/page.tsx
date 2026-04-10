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
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold tracking-tight">Overview</h1>
          <div className="flex items-center gap-1.5">
            <span className="live-dot" />
            <span className="text-xs text-emerald-400 font-medium">Live</span>
          </div>
        </div>
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
