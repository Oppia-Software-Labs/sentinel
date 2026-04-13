import { NextRequest, NextResponse } from 'next/server'
import { registerAgent, getAgents, loadSorobanConfig, createSorobanClient, mirrorAgent } from '@oppialabs/sentinel-sdk'
import { createServiceRoleClient } from '../../../lib/supabase/server'
import { encryptApiKey } from '../../../lib/crypto'
import type { LLMProvider } from '../../../lib/llm'
import { validateApiKey, unauthorizedResponse } from '../../../lib/auth/api-key'

interface RegisterBody {
  ownerId: string
  agentId: string
  endpoint?: string
  description?: string
  type?: 'shieldpay' | 'custom' | 'hosted'
  // Hosted agent fields (required when type === 'hosted')
  provider?: LLMProvider
  apiKey?: string
  model?: string
  systemPrompt?: string
  temperature?: number
}

export async function POST(req: NextRequest) {
  const ownerId = await validateApiKey(req)
  if (!ownerId) return unauthorizedResponse()

  let body: RegisterBody

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    agentId,
    description = '',
    provider,
    apiKey,
    model,
    systemPrompt,
    temperature = 0,
  } = body

  let { type = 'custom', endpoint } = body

  if (!agentId) {
    return NextResponse.json(
      { error: 'agentId is required' },
      { status: 400 },
    )
  }

  const isHosted = !!(provider && apiKey && model && systemPrompt)

  if (isHosted) {
    type = 'hosted'
    const base = process.env.SHIELDPAY_API_URL ?? `http://localhost:${process.env.PORT ?? 4000}`
    endpoint = `${base}/api/agents/hosted?agentId=${encodeURIComponent(agentId)}`
  }

  if (!endpoint) {
    return NextResponse.json(
      { error: 'endpoint is required (or provide provider + apiKey + model + systemPrompt for a hosted agent)' },
      { status: 400 },
    )
  }

  try {
    const soroban = loadSorobanConfig()
    const client = createSorobanClient(soroban)

    const agentType = type === 'hosted' ? 'custom' : type
    await registerAgent(ownerId, { agentId, type: agentType, endpoint, description }, client)

    const supabase = createServiceRoleClient()

    try {
      await mirrorAgent(supabase, ownerId, {
        agentId,
        type: type as 'shieldpay' | 'custom',
        endpoint,
        description,
        isActive: true,
      })
    } catch {
      // Mirror failure is non-fatal -- Soroban is the source of truth
    }

    if (isHosted) {
      const encrypted = encryptApiKey(apiKey!)

      await supabase.from('agent_configs').upsert(
        {
          agent_id: agentId,
          owner_id: ownerId,
          provider: provider!,
          api_key_encrypted: encrypted,
          model: model!,
          system_prompt: systemPrompt!,
          temperature,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'owner_id,agent_id' },
      )
    }

    return NextResponse.json({ ok: true, agentId, endpoint, type })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const ownerId = await validateApiKey(req)
  if (!ownerId) return unauthorizedResponse()

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

export async function DELETE(req: NextRequest) {
  const ownerId = await validateApiKey(req)
  if (!ownerId) return unauthorizedResponse()

  let body: { agentId: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { agentId } = body
  if (!agentId) {
    return NextResponse.json(
      { error: 'agentId is required' },
      { status: 400 },
    )
  }

  try {
    const supabase = createServiceRoleClient()

    await supabase
      .from('registered_agents')
      .update({ is_active: false })
      .eq('agent_id', agentId)
      .eq('owner_id', ownerId)

    await supabase
      .from('agent_configs')
      .delete()
      .eq('agent_id', agentId)
      .eq('owner_id', ownerId)

    return NextResponse.json({ ok: true, agentId, deactivated: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
