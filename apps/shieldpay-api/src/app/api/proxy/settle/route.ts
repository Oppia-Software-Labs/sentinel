import { NextRequest, NextResponse } from 'next/server'
import axios from 'axios'
import { evaluate, loadSorobanConfig } from '@sentinel/sdk'
import type { PaymentIntent } from '@sentinel/sdk'
import { createServiceRoleClient } from '../../../../lib/supabase/server'
import { fundEscrow, releaseEscrow, refundEscrow } from '../../../../lib/escrow/trustless-work'

export async function POST(req: NextRequest) {
  let body: { intent: PaymentIntent; ownerId: string }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { intent, ownerId } = body
  if (!intent || !ownerId) {
    return NextResponse.json({ error: 'Missing intent or ownerId' }, { status: 400 })
  }

  // 1. Full evaluation: consensus + policy on Soroban
  const soroban = loadSorobanConfig()
  let supabase: ReturnType<typeof createServiceRoleClient> | undefined
  try {
    supabase = createServiceRoleClient()
  } catch {
    // Supabase mirror is optional — proceed without it
  }

  let result: Awaited<ReturnType<typeof evaluate>>
  try {
    result = await evaluate(intent, { ownerId, soroban, supabase })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Evaluation failed: ${msg}` }, { status: 502 })
  }

  if (result.decision === 'reject') {
    return NextResponse.json(
      { error: result.reason ?? 'Payment rejected by consensus', sorobanTxId: result.sorobanTxId },
      { status: 402 },
    )
  }

  // 2. Fund escrow before touching the relayer
  let escrowId: string | undefined
  try {
    escrowId = await fundEscrow(intent.amount, intent.vendor)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Escrow funding failed: ${msg}` }, { status: 502 })
  }

  // 3. Forward to x402 facilitator (OZ Relayer)
  const relayerUrl = process.env.OZ_RELAYER_URL
  const relayerKey = process.env.OZ_RELAYER_API_KEY
  if (!relayerUrl) {
    await refundEscrow(escrowId)
    return NextResponse.json({ error: 'OZ_RELAYER_URL not configured' }, { status: 503 })
  }

  try {
    const { data, status } = await axios.post(`${relayerUrl}/settle`, body, {
      headers: { Authorization: `Bearer ${relayerKey ?? ''}` },
      validateStatus: () => true,
    })

    if (status >= 200 && status < 300) {
      await releaseEscrow(escrowId)
      return NextResponse.json(
        { sorobanTxId: result.sorobanTxId, escrowId, decision: result.decision, ...data },
        { status: 200 },
      )
    } else {
      await refundEscrow(escrowId)
      return NextResponse.json({ error: 'Relayer rejected settlement', detail: data }, { status })
    }
  } catch (err) {
    await refundEscrow(escrowId).catch(() => {})
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Relayer unreachable: ${msg}` }, { status: 502 })
  }
}
