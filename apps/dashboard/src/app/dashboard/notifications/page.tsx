'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Webhook, Mail, CheckCircle2, XCircle, Loader2,
  Trash2, Send, Save, KeyRound, CircleDot,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type NotifType = 'webhook' | 'email'

interface NotifConfig {
  id: string
  type: NotifType
  config: Record<string, string>
  enabled: boolean
  events: string[]
  created_at: string
  updated_at: string
}

interface NotifLog {
  id: string
  config_id: string
  event_type: string
  payload: Record<string, unknown>
  status: 'sent' | 'failed'
  error: string | null
  created_at: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_EVENTS = [
  { value: 'transaction_blocked',   label: 'Transaction Blocked' },
  { value: 'transaction_settled',   label: 'Transaction Settled' },
  { value: 'kill_switch_triggered', label: 'Kill-Switch Triggered' },
  { value: 'policy_updated',        label: 'Policy Updated' },
  { value: 'quorum_failure',        label: 'Quorum Failure' },
]

const DEFAULT_EVENTS = ['transaction_blocked', 'transaction_settled', 'kill_switch_triggered']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

// ─── Channel Card ─────────────────────────────────────────────────────────────

interface ChannelCardProps {
  type: NotifType
  existing: NotifConfig | undefined
  onSaved: () => void
}

function ChannelCard({ type, existing, onSaved }: ChannelCardProps) {
  const isWebhook = type === 'webhook'
  const Icon = isWebhook ? Webhook : Mail

  const defaultFields: Record<string, string> = isWebhook
    ? { url: '', secret: '' }
    : { to: '', from: '' }

  const [fields, setFields] = useState<Record<string, string>>(
    existing ? { ...defaultFields, ...existing.config } : defaultFields,
  )
  const [enabled, setEnabled] = useState(existing?.enabled ?? true)
  const [events, setEvents] = useState<string[]>(existing?.events ?? DEFAULT_EVENTS)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isConfigured = existing != null

  function toggleEvent(ev: string) {
    setEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev],
    )
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/notifications/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: existing?.id, type, config: fields, enabled, events }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Channel saved', { description: `${isWebhook ? 'Webhook' : 'Email'} configuration updated.` })
      onSaved()
    } catch (err) {
      toast.error('Save failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setSaving(false)
    }
  }

  async function test() {
    if (!existing) return
    setTesting(true)
    try {
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configId: existing.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Test sent', { description: 'Check your endpoint or inbox.' })
    } catch (err) {
      toast.error('Test failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setTesting(false)
    }
  }

  async function remove() {
    if (!existing) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/notifications/config?id=${existing.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      toast.success('Channel removed')
      onSaved()
    } catch (err) {
      toast.error('Remove failed', { description: err instanceof Error ? err.message : 'Unknown error' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className={cn(
            'h-8 w-8 rounded-md flex items-center justify-center shrink-0',
            isConfigured ? 'bg-emerald-500/10' : 'bg-muted/40',
          )}>
            <Icon className={cn('h-4 w-4', isConfigured ? 'text-emerald-400' : 'text-muted-foreground/50')} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">
              {isWebhook ? 'Webhook' : 'Email'}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              {isWebhook
                ? 'POST JSON to any HTTP endpoint. Optionally sign with HMAC-SHA256.'
                : 'Send alerts via Resend. API key is loaded from the environment.'}
            </p>
          </div>
        </div>
        <div className={cn(
          'shrink-0 inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[10px] font-semibold uppercase tracking-wide',
          isConfigured
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-muted/20 text-muted-foreground/50 border-border',
        )}>
          {isConfigured
            ? <CheckCircle2 className="h-3 w-3" />
            : <CircleDot className="h-3 w-3" />}
          {isConfigured ? 'Connected' : 'Not configured'}
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-5 space-y-5">
        {/* Fields */}
        <div className="grid gap-3 sm:grid-cols-2">
          {isWebhook ? (
            <>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Endpoint URL
                </Label>
                <Input
                  placeholder="https://your-server.com/webhook"
                  value={fields.url ?? ''}
                  onChange={(e) => setFields((f) => ({ ...f, url: e.target.value }))}
                  className="font-mono text-xs h-9"
                />
              </div>
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Secret <span className="normal-case tracking-normal font-normal opacity-60">(optional — enables HMAC-SHA256 signature)</span>
                </Label>
                <Input
                  type="password"
                  placeholder="••••••••••••"
                  value={fields.secret ?? ''}
                  onChange={(e) => setFields((f) => ({ ...f, secret: e.target.value }))}
                  className="font-mono text-xs h-9"
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Recipient
                </Label>
                <Input
                  placeholder="you@example.com"
                  value={fields.to ?? ''}
                  onChange={(e) => setFields((f) => ({ ...f, to: e.target.value }))}
                  className="font-mono text-xs h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  From <span className="normal-case tracking-normal font-normal opacity-60">(optional)</span>
                </Label>
                <Input
                  placeholder="sentinel@yourapp.com"
                  value={fields.from ?? ''}
                  onChange={(e) => setFields((f) => ({ ...f, from: e.target.value }))}
                  className="font-mono text-xs h-9"
                />
              </div>
            </>
          )}
        </div>

        {/* Events */}
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
            Trigger on
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_EVENTS.map((ev) => {
              const active = events.includes(ev.value)
              return (
                <button
                  key={ev.value}
                  type="button"
                  onClick={() => toggleEvent(ev.value)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide border transition-all',
                    active
                      ? 'bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
                      : 'bg-muted/20 text-muted-foreground/50 border-transparent hover:border-border hover:text-muted-foreground',
                  )}
                >
                  {ev.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer row: toggle + actions */}
        <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/50">
          <div className="flex items-center gap-2">
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              className="scale-90"
            />
            <span className="text-[11px] text-muted-foreground">
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {existing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={remove}
                disabled={deleting}
                className="h-8 text-[11px] text-red-400/70 hover:text-red-400 hover:bg-red-500/10 gap-1.5"
              >
                {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Remove
              </Button>
            )}
            {existing && (
              <Button
                variant="outline"
                size="sm"
                onClick={test}
                disabled={testing}
                className="h-8 text-[11px] gap-1.5"
              >
                {testing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                Send test
              </Button>
            )}
            <Button
              size="sm"
              onClick={save}
              disabled={saving}
              className="h-8 text-[11px] gap-1.5"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {existing ? 'Save' : 'Connect'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Delivery Log ─────────────────────────────────────────────────────────────

function DeliveryLog({ configs }: { configs: NotifConfig[] }) {
  const [logs, setLogs] = useState<NotifLog[]>([])

  const configTypeMap = Object.fromEntries(configs.map((c) => [c.id, c.type]))

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('notification_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setLogs((data ?? []) as NotifLog[]))

    const channel = supabase
      .channel('notif-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notification_logs' }, (p) => {
        setLogs((prev) => [p.new as NotifLog, ...prev.slice(0, 29)])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  if (logs.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">No deliveries yet.</p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">
          Configure a channel above and click "Send test" to get started.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {logs.map((log, i) => {
        const channelType = configTypeMap[log.config_id]
        return (
          <div
            key={log.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3',
              i < logs.length - 1 && 'border-b border-border/40',
            )}
          >
            {log.status === 'sent' ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
            )}

            <div className="min-w-0 flex-1 flex items-center gap-3 flex-wrap">
              <span className="text-[11px] font-medium text-foreground capitalize">
                {log.event_type.replace(/_/g, ' ')}
              </span>

              {channelType && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/60">
                  {channelType === 'webhook' ? <Webhook className="h-2.5 w-2.5" /> : <Mail className="h-2.5 w-2.5" />}
                  {channelType}
                </span>
              )}

              {log.error && (
                <span className="text-[10px] text-red-400/70 truncate max-w-[240px]">
                  {log.error}
                </span>
              )}
            </div>

            <span className="text-[10px] text-muted-foreground/50 font-mono shrink-0">
              {timeAgo(log.created_at)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [configs, setConfigs] = useState<NotifConfig[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/config')
      const data = await res.json()
      setConfigs(Array.isArray(data) ? data : [])
    } catch {
      setConfigs([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const webhookConfig = configs.find((c) => c.type === 'webhook')
  const emailConfig = configs.find((c) => c.type === 'email')

  return (
    <div className="p-6 max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-base font-semibold tracking-tight">Notifications</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Alert channels for governance events — blocked payments, settlements, and kill-switches.
        </p>
      </div>

      <div className="border-t border-border" />

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading…
        </div>
      ) : (
        <>
          {/* Channel cards */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
              Channels
            </p>
            <div className="space-y-3">
              <ChannelCard type="webhook" existing={webhookConfig} onSaved={load} />
              <ChannelCard type="email" existing={emailConfig} onSaved={load} />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Delivery log */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                Recent Deliveries
              </p>
              <span className="flex items-center gap-1.5">
                <span className="live-dot" />
                <span className="text-[10px] text-emerald-400 font-medium">Live</span>
              </span>
            </div>
            <DeliveryLog configs={configs} />
          </div>
        </>
      )}
    </div>
  )
}
