'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Vote } from '@/types'

interface Props {
  transactionId: string
}

export function VotesPanel({ transactionId }: Props) {
  const [votes, setVotes] = useState<Vote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase
      .from('votes')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setVotes(data ?? [])
        setLoading(false)
      })

    const channel = supabase
      .channel(`votes-panel-${transactionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `transaction_id=eq.${transactionId}`,
        },
        (payload) => {
          setVotes((prev) => [...prev, payload.new as Vote])
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [transactionId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading votes…
      </div>
    )
  }

  if (votes.length === 0) {
    return (
      <p className="text-xs text-muted-foreground py-1">
        No votes recorded for this transaction.
      </p>
    )
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-3">
        Agent Votes
      </p>
      <div className="flex flex-col gap-2">
        {votes.map((vote) => (
          <div key={vote.id} className="flex items-start gap-2.5">
            {vote.decision === 'approve' ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-foreground">{vote.agent_id}</span>
                <span
                  className={cn(
                    'text-[10px] uppercase font-semibold tracking-wide',
                    vote.decision === 'approve' ? 'text-emerald-400' : 'text-red-400',
                  )}
                >
                  {vote.decision}
                </span>
                {vote.latency_ms != null && (
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {vote.latency_ms}ms
                  </span>
                )}
              </div>
              {vote.reason && (
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {vote.reason}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
