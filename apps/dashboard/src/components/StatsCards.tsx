'use client'

import { useState, useEffect, type ElementType } from 'react'
import { DollarSign, ShieldX, Bot, Activity } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types'

interface Props {
  initialTransactions: Transaction[]
  initialSessionCount: number
  initialAgentCount: number
}

type Accent = 'blue' | 'red' | 'emerald' | 'amber' | 'muted'

const ACCENT: Record<Accent, { value: string; icon: string }> = {
  blue:    { value: 'text-blue-400',    icon: 'text-blue-400/50'    },
  red:     { value: 'text-red-400',     icon: 'text-red-400/50'     },
  emerald: { value: 'text-emerald-400', icon: 'text-emerald-400/50' },
  amber:   { value: 'text-amber-400',   icon: 'text-amber-400/50'   },
  muted:   { value: 'text-muted-foreground', icon: 'text-muted-foreground/50' },
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  sub: string
  icon: ElementType
  accent: Accent
}) {
  const { value: valueClass, icon: iconClass } = ACCENT[accent]
  return (
    <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
          {label}
        </p>
        <Icon className={cn('h-3.5 w-3.5', iconClass)} />
      </div>
      <div>
        <p className={cn('text-2xl font-semibold font-mono leading-none', valueClass)}>
          {value}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1.5">{sub}</p>
      </div>
    </div>
  )
}

export function StatsCards({ initialTransactions, initialSessionCount, initialAgentCount }: Props) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [sessionCount, setSessionCount] = useState(initialSessionCount)

  // Live transactions
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('stats-tx')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (p) => {
        setTransactions((prev) => [p.new as Transaction, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transactions' }, (p) => {
        const tx = p.new as Transaction
        setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)))
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  // Live MPP session count
  useEffect(() => {
    const supabase = createClient()
    const refresh = () => {
      supabase
        .from('mpp_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .then(({ count }) => setSessionCount(count ?? 0))
    }
    const channel = supabase
      .channel('stats-sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mpp_sessions' }, refresh)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStr = todayStart.toISOString()

  const totalSpent = transactions
    .filter((t) => t.status === 'settled' && t.created_at >= todayStr)
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const blockedCount = transactions.filter((t) => t.status === 'rejected').length

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatCard
        label="Total Spent Today"
        value={`$${totalSpent.toFixed(2)}`}
        sub="USDC settled"
        icon={DollarSign}
        accent="blue"
      />
      <StatCard
        label="Blocked"
        value={String(blockedCount)}
        sub="transactions rejected"
        icon={ShieldX}
        accent="red"
      />
      <StatCard
        label="Active Agents"
        value={String(initialAgentCount)}
        sub="registered"
        icon={Bot}
        accent="emerald"
      />
      <StatCard
        label="MPP Sessions"
        value={String(sessionCount)}
        sub="currently active"
        icon={Activity}
        accent={sessionCount > 0 ? 'amber' : 'muted'}
      />
    </div>
  )
}
