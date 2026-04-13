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
        'bg-card border rounded-2xl p-5 space-y-3 transition-colors shadow-[0_1px_3px_rgba(0,0,0,0.06)] group',
        agent.is_active ? 'border-border' : 'border-border/40 opacity-60',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              'h-7 w-7 rounded-md flex items-center justify-center shrink-0',
              isShieldPay ? 'bg-emerald-900/10' : 'bg-emerald-900/8',
            )}
          >
            {isShieldPay && <Zap className="h-3.5 w-3.5 text-emerald-900" />}
            {isHosted && <Sparkles className="h-3.5 w-3.5 text-emerald-800" />}
            {isCustom && <Bot className="h-3.5 w-3.5 text-emerald-800" />}
          </div>

          <span className="font-mono text-sm font-medium text-foreground truncate">
            {agent.agent_id}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Circle
            className={cn(
              'h-2 w-2',
              agent.is_active
                ? 'fill-emerald-800 text-emerald-800'
                : 'fill-muted text-muted',
            )}
          />
          <span
            className={cn(
              'text-[10px] font-semibold uppercase tracking-wide',
              isShieldPay ? 'text-emerald-900' : 'text-emerald-800',
            )}
          >
            {typeLabel}
          </span>
        </div>
      </div>

      {/* Provider */}
      {providerLabel && (
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded font-medium',
              providerLabel === 'openai'
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-orange-500/10 text-orange-400',
            )}
          >
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

      {/* Actions */}
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