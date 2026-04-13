import { NextRequest, NextResponse } from 'next/server'
import { callLLMAgent, validateApiKey, type LLMProvider } from '../../../../lib/llm'

const SAMPLE_INTENT = {
  agentId: 'test-run',
  ownerId: 'test-owner',
  amount: 25,
  assetCode: 'USDC',
  vendor: 'aws-services',
  taskDescription: 'Cloud compute instance for running data pipeline',
}

const SAMPLE_CONTEXT = {
  totalSpentToday: 150,
  totalSpentHour: 30,
}

export async function POST(req: NextRequest) {
  let body: {
    provider: LLMProvider
    apiKey: string
    model: string
    systemPrompt: string
    temperature?: number
    intent?: typeof SAMPLE_INTENT
    context?: typeof SAMPLE_CONTEXT
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { provider, apiKey, model, systemPrompt, temperature } = body
  if (!provider || !apiKey || !model || !systemPrompt) {
    return NextResponse.json(
      { error: 'provider, apiKey, model, and systemPrompt are required' },
      { status: 400 },
    )
  }

  const keyError = await validateApiKey(provider, apiKey)
  if (keyError) {
    return NextResponse.json(
      { error: `API key validation failed: ${keyError}` },
      { status: 401 },
    )
  }

  const intent = body.intent ?? SAMPLE_INTENT
  const context = body.context ?? SAMPLE_CONTEXT

  try {
    const result = await callLLMAgent(
      { provider, apiKey, model, systemPrompt, temperature },
      intent,
      context,
    )

    return NextResponse.json({
      ...result,
      testIntent: intent,
      testContext: context,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `Agent test failed: ${message}` },
      { status: 500 },
    )
  }
}
