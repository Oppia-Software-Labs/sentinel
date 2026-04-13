/**
 * MPP session lifecycle manager.
 * State is kept in-process (Map) and mirrored to Supabase table `mpp_sessions`.
 */

import { createServiceRoleClient } from '../supabase/server'

export interface MppSession {
  sessionId: string
  agentId: string
  ownerId: string
  totalCharged: number
  status: 'active' | 'closed' | 'killed'
  killReason?: string
  openedAt: string
  closedAt?: string
}

// In-process session store
const sessions = new Map<string, MppSession>()

// Configurable per-session spend limit (env var, defaults to 100 USDC)
const SESSION_KILL_LIMIT = parseFloat(process.env.MPP_SESSION_KILL_LIMIT ?? '100')

async function mirrorSession(session: MppSession): Promise<void> {
  try {
    const supabase = createServiceRoleClient()
    const { error } = await supabase.from('mpp_sessions').upsert({
      session_id: session.sessionId,
      agent_id: session.agentId,
      owner_id: session.ownerId,
      total_charged: session.totalCharged,
      status: session.status,
      kill_reason: session.killReason ?? null,
      opened_at: session.openedAt,
      closed_at: session.closedAt ?? null,
      updated_at: new Date().toISOString(),
    })
    if (error) console.error('[mpp mirror error]', error)
  } catch (err) {
    console.error('[mpp mirror exception]', err)
  }
}

export async function openSession(agentId: string, ownerId: string): Promise<string> {
  const sessionId = crypto.randomUUID()
  const session: MppSession = {
    sessionId,
    agentId,
    ownerId,
    totalCharged: 0,
    status: 'active',
    openedAt: new Date().toISOString(),
  }
  sessions.set(sessionId, session)
  await mirrorSession(session)
  return sessionId
}

export async function recordCharge(sessionId: string, amount: number): Promise<void> {
  const session = sessions.get(sessionId)
  if (!session) throw new Error(`Session not found: ${sessionId}`)
  if (session.status !== 'active') throw new Error(`Session ${sessionId} is not active`)

  session.totalCharged += amount

  if (session.totalCharged >= SESSION_KILL_LIMIT) {
    await killSession(sessionId, `Spend limit exceeded: ${session.totalCharged} >= ${SESSION_KILL_LIMIT}`)
    return
  }

  await mirrorSession(session)
}

export async function closeSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId)
  if (!session) throw new Error(`Session not found: ${sessionId}`)

  session.status = 'closed'
  session.closedAt = new Date().toISOString()
  await mirrorSession(session)
  sessions.delete(sessionId)
}

export async function killSession(sessionId: string, reason: string): Promise<void> {
  const now = new Date().toISOString()
  const session = sessions.get(sessionId)

  if (session) {
    session.status = 'killed'
    session.killReason = reason
    session.closedAt = now
    await mirrorSession(session)
    sessions.delete(sessionId)
    return
  }

  // Session not in memory — fall back to Supabase (e.g. after server restart)
  const supabase = createServiceRoleClient()
  const { error } = await supabase
    .from('mpp_sessions')
    .update({
      status: 'killed',
      kill_reason: reason,
      closed_at: now,
      updated_at: now,
    })
    .eq('session_id', sessionId)
    .eq('status', 'active')

  if (error) throw new Error(`Failed to kill session ${sessionId} in Supabase: ${error.message}`)
}

export async function killAllSessions(ownerId?: string): Promise<void> {
  const now = new Date().toISOString()
  const supabase = createServiceRoleClient()

  // Build query targeting all active sessions in Supabase (source of truth)
  let query = supabase
    .from('mpp_sessions')
    .update({
      status: 'killed',
      kill_reason: 'Kill-switch activated',
      closed_at: now,
      updated_at: now,
    })
    .eq('status', 'active')

  if (ownerId) {
    query = query.eq('owner_id', ownerId)
  }

  const { error } = await query
  if (error) throw new Error(`Failed to kill all sessions in Supabase: ${error.message}`)

  // Purge matching sessions from the in-process Map for consistency
  for (const [id, s] of sessions) {
    if (s.status === 'active' && (!ownerId || s.ownerId === ownerId)) {
      sessions.delete(id)
    }
  }
}
