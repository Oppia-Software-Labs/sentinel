/**
 * Risk Agent — detects anomalous payment patterns.
 *
 * Checks:
 * 1. Velocity loop: amount == totalSpentHour (exact repeat in same hour window)
 * 2. Retry storm: X-Request-Count header signals repeated identical requests
 * 3. Suspiciously large single payment relative to hourly spend
 */

import { NextRequest, NextResponse } from 'next/server'
import type { PaymentIntent } from '@sentinel/sdk'

interface AgentInput {
  intent: PaymentIntent
  context: { totalSpentToday: number; totalSpentHour: number }
}

const RETRY_STORM_THRESHOLD = parseInt(process.env.RISK_RETRY_STORM_THRESHOLD ?? '5', 10)
const VELOCITY_MULTIPLIER = parseFloat(process.env.RISK_VELOCITY_MULTIPLIER ?? '3')

export async function POST(req: NextRequest) {
  let body: AgentInput

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { intent, context } = body
  const requestCount = parseInt(req.headers.get('x-request-count') ?? '1', 10)

  // Check 1: Retry storm — too many identical requests in a short window
  if (requestCount >= RETRY_STORM_THRESHOLD) {
    return NextResponse.json({
      decision: 'reject',
      reason: `Retry storm detected: ${requestCount} requests in the current window (limit: ${RETRY_STORM_THRESHOLD})`,
    })
  }

  // Check 2: Velocity loop — the hourly spend is an exact multiple of the payment amount
  // (only suspicious if totalSpentHour is >= 2x the amount, meaning it's happened before)
  if (
    context.totalSpentHour > 0 &&
    intent.amount > 0 &&
    context.totalSpentHour >= intent.amount * 2 &&
    context.totalSpentHour % intent.amount === 0
  ) {
    return NextResponse.json({
      decision: 'reject',
      reason: `Velocity loop detected: payment amount (${intent.amount}) divides hourly spend (${context.totalSpentHour}) exactly, suggesting a repeat loop`,
    })
  }

  // Check 3: Single payment is anomalously large vs hourly baseline
  if (
    context.totalSpentHour > 0 &&
    intent.amount > context.totalSpentHour * VELOCITY_MULTIPLIER
  ) {
    return NextResponse.json({
      decision: 'reject',
      reason: `Suspicious spike: payment ${intent.amount} is ${(intent.amount / context.totalSpentHour).toFixed(1)}x the current hourly spend rate (threshold: ${VELOCITY_MULTIPLIER}x)`,
    })
  }

  return NextResponse.json({
    decision: 'approve',
    reason: 'No anomalous patterns detected',
  })
}
