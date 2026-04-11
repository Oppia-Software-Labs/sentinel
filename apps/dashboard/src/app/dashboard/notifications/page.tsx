import { CheckCircle2, Clock, Hash, Mail, MessageSquare, Send, Webhook } from 'lucide-react'

const channels = [
  {
    id: 'slack',
    name: 'Slack',
    icon: Hash,
    status: 'soon' as const,
    description: 'Sends alerts to #sentinel-alerts when a transaction is blocked or a kill-switch fires.',
    detail: 'Coming soon',
  },
  {
    id: 'email',
    name: 'Email',
    icon: Mail,
    status: 'soon' as const,
    description: 'Receive daily summaries and real-time block alerts via email.',
    detail: 'Coming soon',
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: MessageSquare,
    status: 'soon' as const,
    description: 'Post structured embeds to any channel when governance events fire.',
    detail: 'Coming soon',
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: Send,
    status: 'soon' as const,
    description: 'Push critical alerts instantly to a Telegram bot or group.',
    detail: 'Coming soon',
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    icon: Webhook,
    status: 'soon' as const,
    description: 'Forward raw governance events as JSON to any HTTP endpoint you own.',
    detail: 'Coming soon',
  },
]

const events = [
  { label: 'Transaction blocked', description: 'Fires when consensus rejects a payment intent' },
  { label: 'Kill-switch triggered', description: 'Fires when an MPP session is force-killed' },
  { label: 'Policy updated', description: 'Fires when spend limits or blocked vendors change' },
  { label: 'Agent registered', description: 'Fires when a new voting agent joins the registry' },
  { label: 'Quorum failure', description: 'Fires when fewer than quorum agents respond in time' },
]

export default function NotificationsPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold tracking-tight">Notifications</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Alert channels for governance events — blocked payments, kill-switches, and policy changes.
        </p>
      </div>

      <div className="border-t border-border" />

      {/* Channels */}
      <div className="space-y-2">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Channels</h2>

        <div className="space-y-2">
          {channels.map(ch => {
            const Icon = ch.icon
            const connected = ch.status

            return (
              <div
                key={ch.id}
                className="bg-card border border-border rounded-lg p-4 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${
                    connected ? 'bg-emerald-500/10' : 'bg-muted/30'
                  }`}>
                    <Icon className={`h-4 w-4 ${connected ? 'text-emerald-400' : 'text-muted-foreground/50'}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{ch.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      {ch.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  {connected ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-muted-foreground/40" />
                  )}
                  <span className={`text-[10px] font-semibold uppercase tracking-wide ${
                    connected ? 'text-emerald-400' : 'text-muted-foreground/40'
                  }`}>
                    {ch.detail}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Event types */}
      <div className="space-y-2">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Event Types</h2>
        <p className="text-[11px] text-muted-foreground">
          All enabled channels receive these events. Per-channel filtering is coming with the full notification settings panel.
        </p>

        <div className="mt-3 rounded-lg border border-border overflow-hidden">
          {events.map((ev, i) => (
            <div
              key={ev.label}
              className={`flex items-center justify-between px-4 py-3 ${
                i < events.length - 1 ? 'border-b border-border/50' : ''
              }`}
            >
              <div>
                <p className="text-xs font-medium">{ev.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{ev.description}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-4">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] text-muted-foreground">active</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
