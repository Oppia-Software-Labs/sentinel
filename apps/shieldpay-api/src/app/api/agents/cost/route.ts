/**
 * Cost Agent — evaluates spend accumulation at runtime.
 *
 * Checks:
 * 1. Daily spend cap: totalSpentToday + amount must not exceed threshold
 * 2. Hourly spend cap: totalSpentHour + amount must not exceed threshold
 * 3. Single payment size cap
 */

import { NextRequest, NextResponse } from 'next/server'
import type { PaymentIntent } from '@oppialabs/sentinel-sdk'

interface AgentInput {
  intent: PaymentIntent
  context: { totalSpentToday: number; totalSpentHour: number }
}

const DAILY_CAP = parseFloat(process.env.COST_DAILY_CAP ?? '500')
const HOURLY_CAP = parseFloat(process.env.COST_HOURLY_CAP ?? '100')
const SINGLE_PAYMENT_CAP = parseFloat(process.env.COST_SINGLE_PAYMENT_CAP ?? '50')

export async function POST(req: NextRequest) {
  let body: AgentInput

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { intent, context } = body

  // Check 1: Single payment cap
  if (intent.amount > SINGLE_PAYMENT_CAP) {
    return NextResponse.json({
      decision: 'reject',
      reason: `Single payment ${intent.amount} exceeds per-transaction cap of ${SINGLE_PAYMENT_CAP}`,
    })
  }

  // Check 2: Hourly budget
  const projectedHourly = context.totalSpentHour + intent.amount
  if (projectedHourly > HOURLY_CAP) {
    return NextResponse.json({
      decision: 'reject',
      reason: `Hourly budget would be exceeded: ${projectedHourly.toFixed(2)} > ${HOURLY_CAP} (current: ${context.totalSpentHour}, payment: ${intent.amount})`,
    })
  }

  // Check 3: Daily budget
  const projectedDaily = context.totalSpentToday + intent.amount
  if (projectedDaily > DAILY_CAP) {
    return NextResponse.json({
      decision: 'reject',
      reason: `Daily budget would be exceeded: ${projectedDaily.toFixed(2)} > ${DAILY_CAP} (current: ${context.totalSpentToday}, payment: ${intent.amount})`,
    })
  }

  return NextResponse.json({
    decision: 'approve',
    reason: `Within budget — daily: ${projectedDaily.toFixed(2)}/${DAILY_CAP}, hourly: ${projectedHourly.toFixed(2)}/${HOURLY_CAP}`,
  })
}
