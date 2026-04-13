'use client'

import React, { useState, useEffect } from 'react'
import { ChevronRight, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { VotesPanel } from './VotesPanel'
import { TxHashesPanel } from './TxHashesPanel'
import type { Transaction } from '@/types'

interface Props {
  initialTransactions: Transaction[]
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return new Date(dateStr).toLocaleDateString()
}

const STATUS_BADGE: Record<string, string> = {
  settled:  'bg-emerald-900/10 text-emerald-800 border-emerald-900/18',
  approved: 'bg-emerald-900/10 text-emerald-800 border-emerald-900/18',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/25',
  pending:  'bg-amber-500/15 text-amber-400 border-amber-500/25',
}

const DECISION_COLOR: Record<string, string> = {
  approved: 'text-emerald-800',
  rejected: 'text-red-400',
  timeout:  'text-amber-400',
}

export function TransactionsTable({ initialTransactions }: Props) {
  const [transactions, setTransactions] = useState(initialTransactions)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('tx-table')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (p) => {
        const tx = p.new as Transaction
        setTransactions((prev) => [tx, ...prev.slice(0, 49)])
        setNewIds((prev) => new Set([...prev, tx.id]))
        setTimeout(() => {
          setNewIds((prev) => { const next = new Set(prev); next.delete(tx.id); return next })
        }, 1600)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transactions' }, (p) => {
        const tx = p.new as Transaction
        setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  function toggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-[14px] border-b border-border">
        <div>
          <h2 className="text-sm font-semibold">Transactions</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Click any row to inspect votes and transaction hashes
          </p>
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          {transactions.length} rows
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Run a demo agent — rows will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#eeece8] bg-[#faf9f7]">
                {['', 'Time', 'Agent', 'Vendor', 'Amount', 'Consensus', 'Policy', 'Status', 'Paid'].map(
                  (col, i) => (
                    <th
                      key={i}
                      className={cn(
                        'px-4 py-[14px] text-[11px] uppercase tracking-widest text-[#6b7280] font-medium',
                        col === 'Amount' ? 'text-right' : 'text-left',
                        col === '' && 'w-8',
                      )}
                    >
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <React.Fragment key={tx.id}>
                  <tr
                    className={cn(
                      'border-b border-[#f3f1ed] cursor-pointer transition-colors',
                      'hover:bg-accent',
                      expandedId === tx.id && 'bg-accent/60',
                      newIds.has(tx.id) && 'row-new',
                    )}
                    onClick={() => toggle(tx.id)}
                  >
                    {/* Chevron */}
                    <td className="px-4 py-[14px]">
                      <ChevronRight
                        className={cn(
                          'h-3 w-3 text-muted-foreground/50 transition-transform duration-150',
                          expandedId === tx.id && 'rotate-90 text-muted-foreground',
                        )}
                      />
                    </td>

                    {/* Time */}
                    <td className="px-4 py-[14px] font-mono text-muted-foreground whitespace-nowrap">
                      {timeAgo(tx.created_at)}
                    </td>

                    {/* Agent */}
                    <td className="px-4 py-[14px] font-mono text-foreground max-w-[140px] truncate">
                      {tx.agent_id}
                    </td>

                    {/* Vendor */}
                    <td className="px-4 py-[14px] text-muted-foreground">
                      {tx.vendor ?? '—'}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-[14px] text-right font-mono font-medium text-foreground whitespace-nowrap">
                      ${Number(tx.amount).toFixed(2)}
                      <span className="text-[10px] text-muted-foreground ml-1">
                        {tx.asset_code ?? 'USDC'}
                      </span>
                    </td>

                    {/* Consensus */}
                    <td className="px-4 py-[14px]">
                      <span
                        className={cn(
                          'text-[10px] font-semibold uppercase tracking-wide',
                          DECISION_COLOR[tx.consensus_result ?? ''] ?? 'text-muted-foreground',
                        )}
                      >
                        {tx.consensus_result ?? '—'}
                      </span>
                    </td>

                    {/* Policy */}
                    <td className="px-4 py-[14px]">
                      <span
                        className={cn(
                          'text-[10px] font-semibold uppercase tracking-wide',
                          DECISION_COLOR[tx.policy_decision ?? ''] ?? 'text-muted-foreground',
                        )}
                      >
                        {tx.policy_decision ?? '—'}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-[14px]">
                      <span
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border',
                          STATUS_BADGE[tx.status] ?? 'bg-muted/20 text-muted-foreground border-border',
                        )}
                      >
                        {tx.status}
                      </span>
                    </td>

                    {/* Paid */}
                    <td className="px-4 py-[14px]">
                      {tx.status === 'settled' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-800">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-semibold uppercase tracking-wide">Paid</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/40">—</span>
                      )}
                    </td>
                  </tr>

                  {/* Expanded panel: TX hashes + agent votes */}
                  {expandedId === tx.id && (
                    <tr className="border-b border-[#eeece8] bg-[#faf9f7]">
                      <td colSpan={9} className="px-8 py-4">
                        <div className="flex flex-col gap-5 sm:flex-row sm:gap-10">
                          <div className="sm:w-1/2">
                            <TxHashesPanel transaction={tx} />
                          </div>
                          <div className="sm:w-1/2">
                            <VotesPanel transactionId={tx.id} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
