import { NextRequest, NextResponse } from 'next/server'
import type { PaymentIntent } from '@oppialabs/sentinel-sdk'
import { createServiceRoleClient } from '../../../../lib/supabase/server'
import { decryptApiKey } from '../../../../lib/crypto'
import { callLLMAgent, type LLMProvider } from '../../../../lib/llm'

interface HostedAgentInput {
  intent: PaymentIntent
  context: { totalSpentToday: number; totalSpentHour: number }
}

export async function POST(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId')
  if (!agentId) {
    return NextResponse.json(
      { error: 'agentId query param required' },
      { status: 400 },
    )
  }

  let body: HostedAgentInput
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { intent, context } = body

  try {
    const supabase = createServiceRoleClient()
    const { data: config, error } = await supabase
      .from('agent_configs')
      .select('*')
      .eq('agent_id', agentId)
      .single()

    if (error || !config) {
      return NextResponse.json(
        { decision: 'reject', reason: `No hosted config found for agent "${agentId}"` },
      )
    }

    const apiKey = decryptApiKey(config.api_key_encrypted)

    const result = await callLLMAgent(
      {
        provider: config.provider as LLMProvider,
        apiKey,
        model: config.model,
        systemPrompt: config.system_prompt,
        temperature: Number(config.temperature) || 0,
      },
      intent,
      context,
    )

    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[hosted-agent] ${agentId} error:`, message)
    return NextResponse.json({
      decision: 'reject',
      reason: `Hosted agent error: ${message}`,
    })
  }
}
