import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { verify, loadSorobanConfig } from '@oppialabs/sentinel-sdk'
import type { PaymentIntent } from '@oppialabs/sentinel-sdk'
import { validateApiKey, unauthorizedResponse } from '../../../../lib/auth/api-key'

export async function POST(req: NextRequest) {
  const ownerId = await validateApiKey(req)
  if (!ownerId) return unauthorizedResponse()

  let body: { intent: PaymentIntent }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { intent } = body
  if (!intent) {
    return NextResponse.json({ error: 'Missing intent' }, { status: 400 })
  }

  // 1. Policy check on Soroban
  const soroban = loadSorobanConfig()
  let allowed: boolean
  let reason: string | undefined
  try {
    const result = await verify(intent, { ownerId, soroban })
    allowed = result.allowed
    reason = result.reason
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Policy check failed: ${msg}` }, { status: 502 })
  }

  if (!allowed) {
    return NextResponse.json({ error: reason ?? 'Payment not allowed by policy' }, { status: 402 })
  }

  // 2. Forward to x402 facilitator (OZ Relayer)
  const relayerUrl = process.env.OZ_RELAYER_URL
  const relayerKey = process.env.OZ_RELAYER_API_KEY
  if (!relayerUrl) {
    return NextResponse.json({ error: 'OZ_RELAYER_URL not configured' }, { status: 503 })
  }

  try {
    const { data, status } = await axios.post(`${relayerUrl}/verify`, body, {
      headers: { Authorization: `Bearer ${relayerKey ?? ''}` },
      validateStatus: () => true,
    })
    return NextResponse.json(data, { status })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Relayer unreachable: ${msg}` }, { status: 502 })
  }
}
