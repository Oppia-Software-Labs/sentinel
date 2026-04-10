import { NextRequest, NextResponse } from 'next/server'
import {
  openSession,
  recordCharge,
  closeSession,
  killSession,
  killAllSessions,
} from '../../../lib/mpp/session-manager'

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
  let body: MppBody

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, sessionId, agentId, ownerId, amount, reason } = body

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
        return NextResponse.json({ ok: true })
      }

      case 'kill_all': {
        await killAllSessions(ownerId)
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
