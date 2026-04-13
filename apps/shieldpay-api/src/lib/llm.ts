import type { PaymentIntent } from '@oppialabs/sentinel-sdk'

export type LLMProvider = 'openai' | 'anthropic'

export interface LLMAgentConfig {
  provider: LLMProvider
  apiKey: string
  model: string
  systemPrompt: string
  temperature?: number
}

interface AgentContext {
  totalSpentToday: number
  totalSpentHour: number
}

interface AgentDecision {
  decision: 'approve' | 'reject'
  reason: string
}

function buildUserMessage(intent: PaymentIntent, context: AgentContext): string {
  return `PAYMENT INTENT:
- Agent ID: ${intent.agentId}
- Vendor: ${intent.vendor}
- Amount: ${intent.amount} ${intent.assetCode}
- Task: "${intent.taskDescription ?? '(none)'}"

SPEND CONTEXT:
- Total spent today: $${context.totalSpentToday.toFixed(2)}
- Total spent this hour: $${context.totalSpentHour.toFixed(2)}

Respond with JSON only: {"decision": "approve" | "reject", "reason": "<one sentence>"}`
}

function parseDecision(text: string): AgentDecision {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`LLM returned non-JSON: ${text}`)

  const parsed = JSON.parse(jsonMatch[0])
  if (parsed.decision !== 'approve' && parsed.decision !== 'reject') {
    throw new Error(`Invalid decision value: ${parsed.decision}`)
  }

  return {
    decision: parsed.decision as 'approve' | 'reject',
    reason: String(parsed.reason ?? 'no reason'),
  }
}

async function callOpenAI(
  config: LLMAgentConfig,
  intent: PaymentIntent,
  context: AgentContext,
): Promise<AgentDecision> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 256,
      temperature: config.temperature ?? 0,
      messages: [
        { role: 'system', content: config.systemPrompt },
        { role: 'user', content: buildUserMessage(intent, context) },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`OpenAI ${res.status}: ${body}`)
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  const text = data.choices[0]?.message?.content?.trim() ?? ''
  return parseDecision(text)
}

async function callAnthropic(
  config: LLMAgentConfig,
  intent: PaymentIntent,
  context: AgentContext,
): Promise<AgentDecision> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 256,
      temperature: config.temperature ?? 0,
      system: config.systemPrompt,
      messages: [
        { role: 'user', content: buildUserMessage(intent, context) },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Anthropic ${res.status}: ${body}`)
  }

  const data = (await res.json()) as {
    content: Array<{ type: string; text: string }>
  }
  const text = data.content.find((c) => c.type === 'text')?.text?.trim() ?? ''
  return parseDecision(text)
}

/**
 * Call an LLM provider with the agent's config and a payment intent.
 * Returns a structured { decision, reason } vote.
 */
export async function callLLMAgent(
  config: LLMAgentConfig,
  intent: PaymentIntent,
  context: AgentContext,
): Promise<AgentDecision> {
  switch (config.provider) {
    case 'openai':
      return callOpenAI(config, intent, context)
    case 'anthropic':
      return callAnthropic(config, intent, context)
    default:
      throw new Error(`Unsupported provider: ${config.provider}`)
  }
}

/**
 * Validate that an API key works by making a minimal request.
 * Returns null on success, or an error message.
 */
export async function validateApiKey(
  provider: LLMProvider,
  apiKey: string,
): Promise<string | null> {
  try {
    if (provider === 'openai') {
      const res = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(10_000),
      })
      if (!res.ok) return `OpenAI returned ${res.status} — check your API key`
      return null
    }

    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }],
        }),
        signal: AbortSignal.timeout(10_000),
      })
      if (res.status === 401) return 'Invalid Anthropic API key'
      return null
    }

    return `Unknown provider: ${provider}`
  } catch (err) {
    return err instanceof Error ? err.message : String(err)
  }
}
