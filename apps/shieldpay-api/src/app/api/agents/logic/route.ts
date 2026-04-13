/**
 * Logic Agent — LLM-backed semantic reasoning over payment intent.
 *
 * Uses OpenAI gpt-4o-mini (fast) to decide whether a payment is legitimate.
 * Falls back to rule-based checks if OPENAI_API_KEY is not set.
 */

import { NextRequest, NextResponse } from 'next/server'
import type { PaymentIntent } from '@oppialabs/sentinel-sdk'

interface AgentInput {
  intent: PaymentIntent
  context: { totalSpentToday: number; totalSpentHour: number }
}

const SUPPORTED_ASSETS = (process.env.LOGIC_SUPPORTED_ASSETS ?? 'USDC,USDT,XLM').split(',')
const SUSPICIOUS_VENDORS = new Set([
  ...(process.env.LOGIC_SUSPICIOUS_VENDORS ?? '').split(',').filter(Boolean),
  'test', 'unknown', 'null', 'undefined', 'admin', 'root',
])

export async function POST(req: NextRequest) {
  let body: AgentInput
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { intent, context } = body

  // Basic sanity checks before LLM (fast, cheap)
  if (!intent.vendor || SUSPICIOUS_VENDORS.has(intent.vendor.toLowerCase().trim())) {
    return NextResponse.json({
      decision: 'reject',
      reason: `Vendor "${intent.vendor}" is empty or on the suspicious vendor list`,
    })
  }
  if (!isFinite(intent.amount) || intent.amount <= 0) {
    return NextResponse.json({
      decision: 'reject',
      reason: `Amount must be a positive finite number, got: ${intent.amount}`,
    })
  }
  if (!SUPPORTED_ASSETS.includes(intent.assetCode)) {
    return NextResponse.json({
      decision: 'reject',
      reason: `Asset "${intent.assetCode}" is not supported. Supported: ${SUPPORTED_ASSETS.join(', ')}`,
    })
  }

  // LLM reasoning via OpenAI gpt-4o-mini
  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    try {
      const result = await callOpenAI(intent, context, openaiKey)
      return NextResponse.json(result)
    } catch (err) {
      console.error('[logic-agent] OpenAI call failed, using fallback:', err)
    }
  }

  // Rule-based fallback
  const desc = intent.taskDescription ?? ''
  if (desc.length < 5) {
    return NextResponse.json({
      decision: 'reject',
      reason: 'taskDescription is too short or missing — cannot assess intent',
    })
  }

  return NextResponse.json({
    decision: 'approve',
    reason: `Intent looks coherent — vendor: ${intent.vendor}, asset: ${intent.assetCode}, amount: ${intent.amount}`,
  })
}

async function callOpenAI(
  intent: PaymentIntent,
  context: { totalSpentToday: number; totalSpentHour: number },
  apiKey: string,
): Promise<{ decision: 'approve' | 'reject'; reason: string }> {
  const prompt = `You are a payment governance agent for an AI wallet system. Evaluate whether this payment request is legitimate.

PAYMENT INTENT:
- Agent ID: ${intent.agentId}
- Vendor: ${intent.vendor}
- Amount: ${intent.amount} ${intent.assetCode}
- Task: "${intent.taskDescription ?? '(none)'}"

SPEND CONTEXT:
- Today: $${context.totalSpentToday.toFixed(2)} USDC
- This hour: $${context.totalSpentHour.toFixed(2)} USDC

Respond with JSON only: {"decision": "approve" | "reject", "reason": "<one sentence>"}`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 128,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(8000),
  })

  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)

  const data = await res.json() as { choices: Array<{ message: { content: string } }> }
  const text = data.choices[0]?.message?.content?.trim() ?? ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`LLM returned non-JSON: ${text}`)

  const parsed = JSON.parse(jsonMatch[0])
  if (parsed.decision !== 'approve' && parsed.decision !== 'reject') {
    throw new Error(`Invalid decision: ${parsed.decision}`)
  }

  return {
    decision: parsed.decision as 'approve' | 'reject',
    reason: String(parsed.reason ?? 'no reason'),
  }
}
