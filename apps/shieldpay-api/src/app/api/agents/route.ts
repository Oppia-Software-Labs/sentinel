import { NextRequest, NextResponse } from 'next/server'
import { registerAgent, getAgents, loadSorobanConfig, createSorobanClient, mirrorAgent } from '@sentinel/sdk'
import { createServiceRoleClient } from '../../../lib/supabase/server'

export async function POST(req: NextRequest) {
  let body: {
    ownerId: string
    agentId: string
    endpoint: string
    description?: string
    type?: 'shieldpay' | 'custom'
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { ownerId, agentId, endpoint, description = '', type = 'custom' } = body

  if (!ownerId || !agentId || !endpoint) {
    return NextResponse.json({ error: 'ownerId, agentId and endpoint are required' }, { status: 400 })
  }

  try {
    const soroban = loadSorobanConfig()
    const client = createSorobanClient(soroban)
    await registerAgent(ownerId, { agentId, type, endpoint, description }, client)

    // Mirror to Supabase so the dashboard sees the new agent immediately
    try {
      const supabase = createServiceRoleClient()
      await mirrorAgent(supabase, ownerId, { agentId, type, endpoint, description, isActive: true })
    } catch {
      // Mirror failure is non-fatal — Soroban is the source of truth
    }

    return NextResponse.json({ ok: true, agentId, endpoint })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const ownerId = req.nextUrl.searchParams.get('ownerId')

  if (!ownerId) {
    return NextResponse.json({ error: 'ownerId query param required' }, { status: 400 })
  }

  try {
    const soroban = loadSorobanConfig()
    const client = createSorobanClient(soroban)
    const agents = await getAgents(ownerId, client)
    return NextResponse.json({ agents })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
