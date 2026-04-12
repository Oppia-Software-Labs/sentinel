'use client'

import { useState, useEffect } from 'react'
import { Bot, Zap, Globe, Circle, Sparkles, Trash2, Power } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { RegisterAgentModal } from './RegisterAgentModal'
import type { RegisteredAgent } from '@/types'

interface Props {
  initialAgents: RegisteredAgent[]
}

export function AgentsList({ initialAgents }: Props) {
  const [agents, setAgents] = useState(initialAgents)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('agents-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'registered_agents' }, (p) => {
        setAgents(prev => [p.new as RegisteredAgent, ...prev])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'registered_agents' }, (p) => {
        const updated = p.new as RegisteredAgent
        setAgents(prev => prev.map(a => a.id === updated.id ? updated : a))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const active   = agents.filter(a => a.is_active)
  const inactive = agents.filter(a => !a.is_active)

  function handleDeactivated(agentId: string) {
    setAgents(prev => prev.map(a =>
      a.agent_id === agentId ? { ...a, is_active: false } : a
    ))
  }

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
        <div className="bg-card border border-border rounded-lg py-16 text-center">
          <Bot className="h-6 w-6 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No agents registered yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Add an AI agent or connect a custom endpoint.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {agents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onDeactivated={handleDeactivated}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function AgentCard({
  agent,
  onDeactivated,
}: {
  agent: RegisteredAgent
  onDeactivated: (agentId: string) => void
}) {
  const [deleting, setDeleting] = useState(false)

  const isShieldPay = agent.type === 'shieldpay'
  const isHosted = agent.type === 'hosted'
  const isCustom = agent.type === 'custom'

  const iconBg = isShieldPay
    ? 'bg-blue-500/10'
    : isHosted
      ? 'bg-emerald-500/10'
      : 'bg-violet-500/10'

  const typeColor = isShieldPay
    ? 'text-blue-400'
    : isHosted
      ? 'text-emerald-400'
      : 'text-violet-400'

  const typeLabel = isHosted ? 'ai hosted' : agent.type

  const providerLabel = isHosted && agent.endpoint?.includes('agentId=')
    ? detectProvider(agent.description)
    : null

  async function handleDeactivate() {
    if (!confirm(`Deactivate agent "${agent.agent_id}"? It will stop voting on payments.`)) return

    setDeleting(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerId: agent.owner_id,
          agentId: agent.agent_id,
        }),
      })

      if (res.ok) {
        toast.success('Agent deactivated', { description: agent.agent_id })
        onDeactivated(agent.agent_id)
      } else {
        const body = await res.json().catch(() => ({}))
        toast.error('Failed', { description: body.error ?? `HTTP ${res.status}` })
      }
    } catch {
      toast.error('Network error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className={cn(
        'bg-card border rounded-lg p-4 space-y-3 transition-colors group',
        agent.is_active ? 'border-border' : 'border-border/40 opacity-60',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              'h-7 w-7 rounded-md flex items-center justify-center shrink-0',
              iconBg,
            )}
          >
            {isShieldPay && <Zap className="h-3.5 w-3.5 text-blue-400" />}
            {isHosted && <Sparkles className="h-3.5 w-3.5 text-emerald-400" />}
            {isCustom && <Bot className="h-3.5 w-3.5 text-violet-400" />}
          </div>
          <span className="font-mono text-sm font-medium text-foreground truncate">
            {agent.agent_id}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Circle
            className={cn(
              'h-2 w-2',
              agent.is_active ? 'fill-emerald-400 text-emerald-400' : 'fill-muted text-muted',
            )}
          />
          <span className={cn('text-[10px] font-semibold uppercase tracking-wide', typeColor)}>
            {typeLabel}
          </span>
        </div>
      </div>

      {/* Provider badge for hosted agents */}
      {providerLabel && (
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded font-medium',
            providerLabel === 'openai'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-orange-500/10 text-orange-400',
          )}>
            {providerLabel === 'openai' ? 'OpenAI' : 'Anthropic'}
          </span>
        </div>
      )}

      {/* Description */}
      {agent.description && (
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
          {agent.description}
        </p>
      )}

      {/* Endpoint */}
      {agent.endpoint && !isHosted && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-border/50">
          <Globe className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          <span className="font-mono text-[10px] text-muted-foreground truncate">
            {agent.endpoint}
          </span>
        </div>
      )}

      {/* Actions — visible on hover for non-shieldpay agents */}
      {!isShieldPay && agent.is_active && (
        <div className="flex items-center gap-1.5 pt-1 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={handleDeactivate}
            disabled={deleting}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
          >
            {deleting
              ? <Power className="h-3 w-3 animate-pulse" />
              : <Trash2 className="h-3 w-3" />
            }
            {deleting ? 'Deactivating...' : 'Deactivate'}
          </button>
        </div>
      )}
    </div>
  )
}

function detectProvider(description: string | null): 'openai' | 'anthropic' | null {
  if (!description) return null
  const lower = description.toLowerCase()
  if (lower.includes('openai') || lower.includes('gpt')) return 'openai'
  if (lower.includes('anthropic') || lower.includes('claude')) return 'anthropic'
  return null
}
