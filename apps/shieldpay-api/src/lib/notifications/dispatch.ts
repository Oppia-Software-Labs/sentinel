import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Resend } from 'resend';

export type NotificationEvent =
  | 'transaction_blocked'
  | 'transaction_settled'
  | 'kill_switch_triggered'
  | 'policy_updated'
  | 'quorum_failure'

interface NotificationConfig {
  id: string
  type: 'webhook' | 'email'
  config: Record<string, string>
  events: string[]
}

async function fireWebhook(
  config: NotificationConfig,
  event: NotificationEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const { url, secret } = config.config
  if (!url) throw new Error('webhook url not configured')

  const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() })

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (secret) {
    const sig = crypto.createHmac('sha256', secret).update(body).digest('hex')
    headers['X-Sentinel-Signature'] = `sha256=${sig}`
  }

  const res = await fetch(url, { method: 'POST', headers, body })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
}

// ─── Email meta per event ────────────────────────────────────────────────────

const EVENT_META: Record<NotificationEvent, { label: string; emoji: string; accent: string; bg: string }> = {
  transaction_settled:    { label: 'Transaction Settled',    emoji: '✅', accent: '#34d399', bg: '#052e16' },
  transaction_blocked:    { label: 'Transaction Blocked',    emoji: '🚫', accent: '#f87171', bg: '#2d0a0a' },
  kill_switch_triggered:  { label: 'Kill-Switch Triggered',  emoji: '⛔', accent: '#fbbf24', bg: '#2d1a00' },
  policy_updated:         { label: 'Policy Updated',         emoji: '🛡️', accent: '#60a5fa', bg: '#0c1a2e' },
  quorum_failure:         { label: 'Quorum Failure',         emoji: '⚠️', accent: '#fb923c', bg: '#2d1500' },
}

// ─── Build detail rows from payload ──────────────────────────────────────────

function buildRows(event: NotificationEvent, payload: Record<string, unknown>): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = []

  const add = (label: string, key: string) => {
    const val = payload[key]
    if (val != null && val !== '') rows.push({ label, value: String(val) })
  }

  if (event === 'transaction_settled' || event === 'transaction_blocked') {
    add('Vendor',      'vendor')
    add('Amount',      'amount')
    if (event === 'transaction_blocked') add('Reason', 'reason')
    add('Escrow',      'escrowId')
    add('Payment TX',  'paymentTxHash')
  } else if (event === 'kill_switch_triggered') {
    add('Session',  'sessionId')
    add('Owner',    'ownerId')
    add('Reason',   'reason')
  } else {
    // Generic: dump top-level scalar fields
    for (const [k, v] of Object.entries(payload)) {
      if (typeof v !== 'object' && v != null) {
        rows.push({ label: k.replace(/_/g, ' '), value: String(v) })
      }
    }
  }

  return rows
}

// ─── HTML template ───────────────────────────────────────────────────────────

function buildHtml(event: NotificationEvent, payload: Record<string, unknown>): string {
  const meta   = EVENT_META[event] ?? { label: event, emoji: '🔔', accent: '#94a3b8', bg: '#0f172a' }
  const rows   = buildRows(event, payload)
  const ts     = new Date().toUTCString()
  const isHash = (v: string) => /^[0-9a-f]{40,}$/i.test(v)
  const net    = 'testnet'

  const rowsHtml = rows.map(({ label, value }) => {
    const display = isHash(value)
      ? `<a href="https://stellar.expert/explorer/${net}/tx/${value}" style="color:${meta.accent};text-decoration:none;font-family:monospace;font-size:12px;">${value.slice(0, 16)}…${value.slice(-8)}</a>`
      : `<span style="font-family:monospace;font-size:13px;color:#e2e8f0;">${value}</span>`

    return `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #1e293b;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;white-space:nowrap;width:140px;">
          ${label}
        </td>
        <td style="padding:10px 16px;border-bottom:1px solid #1e293b;">
          ${display}
        </td>
      </tr>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${meta.label}</title>
</head>
<body style="margin:0;padding:0;background:#0a0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#0f172a;border:1px solid #1e293b;border-bottom:none;border-radius:12px 12px 0 0;padding:28px 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#475569;font-weight:600;">Sentinel</span>
                    <span style="font-size:11px;color:#1e293b;margin:0 6px;">·</span>
                    <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#334155;">AI Payment Governance</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Event banner -->
          <tr>
            <td style="background:${meta.bg};border-left:1px solid #1e293b;border-right:1px solid #1e293b;padding:24px 32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:12px;vertical-align:middle;font-size:24px;line-height:1;">${meta.emoji}</td>
                  <td style="vertical-align:middle;">
                    <div style="font-size:18px;font-weight:700;color:#f1f5f9;letter-spacing:-0.02em;">${meta.label}</div>
                    <div style="font-size:12px;color:${meta.accent};margin-top:3px;font-weight:500;">${ts}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Detail rows -->
          ${rows.length > 0 ? `
          <tr>
            <td style="background:#0d1526;border-left:1px solid #1e293b;border-right:1px solid #1e293b;">
              <table width="100%" cellpadding="0" cellspacing="0">
                ${rowsHtml}
              </table>
            </td>
          </tr>` : ''}

          <!-- Footer -->
          <tr>
            <td style="background:#0f172a;border:1px solid #1e293b;border-top:1px solid #0d1526;border-radius:0 0 12px 12px;padding:18px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:11px;color:#334155;">
                    Sent by <span style="color:#475569;font-weight:600;">ShieldPay</span> · Stellar Testnet
                  </td>
                  <td align="right" style="font-size:11px;color:#1e293b;">
                    sentinel
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Fire email ───────────────────────────────────────────────────────────────

async function fireEmail(
  config: NotificationConfig,
  event: NotificationEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const { to } = config.config
  const api_key = process.env.RESEND_API_KEY;
  if (!to || !api_key) throw new Error('email to/api_key not configured')

  const resend = new Resend(api_key)

  const meta    = EVENT_META[event] ?? { label: event }
  const subject = `${meta.emoji ?? '🔔'} ${meta.label} — Sentinel`
  const html    = buildHtml(event, payload)

  const { error } = await resend.emails.send({
    from: 'Sentinel <noreply@oppialabs.com>',
    to: [to],
    subject,
    html,
  })

  if (error) throw new Error(error.message)
}

export async function dispatchNotifications(
  supabase: SupabaseClient,
  event: NotificationEvent,
  payload: Record<string, unknown>,
): Promise<void> {
  const { data: configs } = await supabase
    .from('notification_configs')
    .select('id, type, config, events')
    .eq('enabled', true)

  if (!configs || configs.length === 0) return

  const matching = (configs as NotificationConfig[]).filter((c) =>
    c.events?.includes(event),
  )

  await Promise.allSettled(
    matching.map(async (cfg) => {
      let status: 'sent' | 'failed' = 'sent'
      let error: string | undefined

      try {
        if (cfg.type === 'webhook') {
          await fireWebhook(cfg, event, payload)
        } else if (cfg.type === 'email') {
          await fireEmail(cfg, event, payload)
        }
      } catch (err) {
        status = 'failed'
        error = err instanceof Error ? err.message : String(err)
        console.warn(`[notifications] ${cfg.type} dispatch failed:`, error)
      }

      await supabase.from('notification_logs').insert({
        config_id: cfg.id,
        event_type: event,
        payload,
        status,
        error: error ?? null,
      })
    }),
  )
}
