'use client'

import { useState, useEffect } from 'react'
import { Bot, Zap, Globe, Circle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { RegisterAgentModal } from './RegisterAgentModal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { RegisteredAgent } from '@/types'

interface Props {
  initialAgents: RegisteredAgent[]
}

export function AgentsList({ initialAgents }: Props) {
  const [agents, setAgents] = useState(initialAgents)
  const [detailAgent, setDetailAgent] = useState<RegisteredAgent | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('agents-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'registered_agents' }, (p) => {
        setAgents((prev) => [p.new as RegisteredAgent, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'registered_agents' }, (p) => {
        const updated = p.new as RegisteredAgent
        setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const active = agents.filter((a) => a.is_active)
  const inactive = agents.filter((a) => !a.is_active)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-sm text-muted-foreground font-mono">
            {active.length} active
            {inactive.length > 0 && (
              <span className="text-muted-foreground/50"> · {inactive.length} inactive</span>
            )}
          </span>
        </div>
        <RegisterAgentModal />
      </div>

      {agents.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl py-16 text-center shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
          <Bot className="h-6 w-6 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No agents registered yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Register a custom agent or run the ShieldPay built-ins.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onOpen={() => setDetailAgent(agent)} />
          ))}
        </div>
      )}

      <Dialog open={detailAgent !== null} onOpenChange={(open) => !open && setDetailAgent(null)}>
        <DialogContent className="sm:max-w-md">
          {detailAgent && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-base">{detailAgent.agent_id}</DialogTitle>
                <DialogDescription className="sr-only">
                  Details for agent {detailAgent.agent_id}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md',
                      detailAgent.type === 'shieldpay'
                        ? 'bg-emerald-900/10 text-emerald-900'
                        : 'bg-emerald-900/8 text-emerald-800',
                    )}
                  >
                    {detailAgent.type}
                  </span>
                  <span
                    className={cn(
                      'text-[10px] font-semibold uppercase tracking-wide',
                      detailAgent.is_active ? 'text-emerald-800' : 'text-muted-foreground',
                    )}
                  >
                    {detailAgent.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {detailAgent.provider && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Provider</p>
                    <p className="font-mono text-xs">{detailAgent.provider}</p>
                  </div>
                )}
                {detailAgent.description && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Description</p>
                    <p className="text-xs text-foreground leading-relaxed">{detailAgent.description}</p>
                  </div>
                )}
                {detailAgent.endpoint && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Endpoint</p>
                    <p className="font-mono text-[11px] break-all text-foreground">{detailAgent.endpoint}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Registered</p>
                  <p className="text-xs text-foreground">
                    {new Date(detailAgent.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AgentCard({ agent, onOpen }: { agent: RegisteredAgent; onOpen: () => void }) {
  const isShieldPay = agent.type === 'shieldpay'

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'w-full text-left bg-card border rounded-2xl p-5 space-y-3 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.06)]',
        'hover:border-emerald-900/25 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        agent.is_active ? 'border-border' : 'border-border/40 opacity-60',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              'h-7 w-7 rounded-md flex items-center justify-center shrink-0',
              isShieldPay ? 'bg-emerald-900/10' : 'bg-emerald-900/8',
            )}
          >
            {isShieldPay ? (
              <Zap className="h-3.5 w-3.5 text-emerald-900" />
            ) : (
              <Bot className="h-3.5 w-3.5 text-emerald-800" />
            )}
          </div>
          <span className="font-mono text-sm font-medium text-foreground truncate">
            {agent.agent_id}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Circle
            className={cn(
              'h-2 w-2',
              agent.is_active ? 'fill-emerald-800 text-emerald-800' : 'fill-muted text-muted',
            )}
          />
          <span
            className={cn(
              'text-[10px] font-semibold uppercase tracking-wide',
              isShieldPay ? 'text-emerald-900' : 'text-emerald-800',
            )}
          >
            {agent.type}
          </span>
        </div>
      </div>

      {/* Description */}
      {agent.description && (
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {agent.description}
        </p>
      )}

      {/* Endpoint */}
      {agent.endpoint && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
          <Globe className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          <span className="font-mono text-[10px] text-muted-foreground truncate">
            {agent.endpoint}
          </span>
        </div>
      )}
    </button>
  )
}
