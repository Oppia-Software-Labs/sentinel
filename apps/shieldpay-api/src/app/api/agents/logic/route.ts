/**
 * Logic Agent — validates semantic coherence of the payment intent.
 *
 * Checks:
 * 1. Vendor field is non-empty and not in the suspicious vendor list
 * 2. taskDescription is present and looks like a real description (min length, no injection patterns)
 * 3. assetCode is a supported asset
 * 4. amount is a positive finite number
 */

import { NextRequest, NextResponse } from 'next/server'
import type { PaymentIntent } from '@sentinel/sdk'

interface AgentInput {
  intent: PaymentIntent
  context: { totalSpentToday: number; totalSpentHour: number }
}

const SUPPORTED_ASSETS = (process.env.LOGIC_SUPPORTED_ASSETS ?? 'USDC,USDT,XLM').split(',')

const SUSPICIOUS_VENDORS = new Set([
  ...(process.env.LOGIC_SUSPICIOUS_VENDORS ?? '').split(',').filter(Boolean),
  'test',
  'unknown',
  'null',
  'undefined',
  'admin',
  'root',
])

const MIN_DESCRIPTION_LENGTH = 5
// Simple injection pattern check — block strings that look like prompt injection
const INJECTION_PATTERN = /(<\s*script|ignore\s+previous|system\s*:|\[INST\])/i

export async function POST(req: NextRequest) {
  let body: AgentInput

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { intent } = body

  // Check 1: Vendor
  if (!intent.vendor || intent.vendor.trim().length === 0) {
    return NextResponse.json({ decision: 'reject', reason: 'Vendor field is empty' })
  }
  if (SUSPICIOUS_VENDORS.has(intent.vendor.toLowerCase().trim())) {
    return NextResponse.json({
      decision: 'reject',
      reason: `Vendor "${intent.vendor}" is on the suspicious vendor list`,
    })
  }

  // Check 2: Amount
  if (!isFinite(intent.amount) || intent.amount <= 0) {
    return NextResponse.json({
      decision: 'reject',
      reason: `Amount must be a positive finite number, got: ${intent.amount}`,
    })
  }

  // Check 3: Asset code
  if (!SUPPORTED_ASSETS.includes(intent.assetCode)) {
    return NextResponse.json({
      decision: 'reject',
      reason: `Asset "${intent.assetCode}" is not supported. Supported: ${SUPPORTED_ASSETS.join(', ')}`,
    })
  }

  // Check 4: Task description coherence
  const desc = intent.taskDescription ?? ''
  if (desc.length < MIN_DESCRIPTION_LENGTH) {
    return NextResponse.json({
      decision: 'reject',
      reason: `taskDescription is too short or missing (min ${MIN_DESCRIPTION_LENGTH} chars)`,
    })
  }
  if (INJECTION_PATTERN.test(desc)) {
    return NextResponse.json({
      decision: 'reject',
      reason: 'taskDescription contains suspicious content (possible injection attempt)',
    })
  }

  return NextResponse.json({
    decision: 'approve',
    reason: `Intent is coherent — vendor: ${intent.vendor}, asset: ${intent.assetCode}, amount: ${intent.amount}`,
  })
}
