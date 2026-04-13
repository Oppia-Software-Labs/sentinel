import { NextRequest, NextResponse } from 'next/server'
import {
  openSession,
  recordCharge,
  closeSession,
  killSession,
  killAllSessions,
} from '../../../lib/mpp/session-manager'
import { createServiceRoleClient } from '../../../lib/supabase/server'
import { dispatchNotifications } from '../../../lib/notifications/dispatch'
import { validateApiKey, unauthorizedResponse } from '../../../lib/auth/api-key'

type MppAction = 'open' | 'charge' | 'close' | 'kill' | 'kill_all'

interface MppBody {
  action: MppAction
  sessionId?: string
  agentId?: string
  ownerId?: string
  amount?: number
  reason?: string
}

export async function POST(req: NextRequest) {
  const authOwnerId = await validateApiKey(req)
  if (!authOwnerId) return unauthorizedResponse()

  let body: MppBody

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, sessionId, agentId, amount, reason } = body
  // Always use the authenticated owner_id; ignore any client-supplied ownerId
  const ownerId = authOwnerId

  try {
    switch (action) {
      case 'open': {
        if (!agentId || !ownerId)
          return NextResponse.json({ error: 'agentId and ownerId required' }, { status: 400 })
        const id = await openSession(agentId, ownerId)
        return NextResponse.json({ sessionId: id })
      }

      case 'charge': {
        if (!sessionId || amount == null)
          return NextResponse.json({ error: 'sessionId and amount required' }, { status: 400 })
        await recordCharge(sessionId, amount)
        return NextResponse.json({ ok: true })
      }

      case 'close': {
        if (!sessionId)
          return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
        await closeSession(sessionId)
        return NextResponse.json({ ok: true })
      }

      case 'kill': {
        if (!sessionId)
          return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
        await killSession(sessionId, reason ?? 'Manual kill')
        try {
          const supabase = createServiceRoleClient()
          await dispatchNotifications(supabase, 'kill_switch_triggered', { sessionId, reason: reason ?? 'Manual kill' })
        } catch { /* non-fatal */ }
        return NextResponse.json({ ok: true })
      }

      case 'kill_all': {
        await killAllSessions(ownerId)
        try {
          const supabase = createServiceRoleClient()
          await dispatchNotifications(supabase, 'kill_switch_triggered', { sessionId: 'all', ownerId, reason: 'Kill-all triggered' })
        } catch { /* non-fatal */ }
        return NextResponse.json({ ok: true })
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid: open, charge, close, kill, kill_all` },
          { status: 400 },
        )
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
