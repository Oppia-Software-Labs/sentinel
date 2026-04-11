import { NextRequest, NextResponse } from 'next/server'
import * as StellarSdk from '@stellar/stellar-sdk'
import { evaluate, loadSorobanConfig } from '@sentinel/sdk'
import type { PaymentIntent } from '@sentinel/sdk'
import { createServiceRoleClient } from '../../../../lib/supabase/server'
import { fundEscrow, releaseEscrow } from '../../../../lib/escrow/trustless-work'
import {
  detectX402,
  fetchWithX402,
  vendorFromUrl,
  tokenUnitsToUsdc,
} from '../../../../lib/x402/client'

export async function POST(req: NextRequest) {
  let body: {
    intent: PaymentIntent
    ownerId: string
    resourceUrl?: string     // optional: real x402-protected URL to fetch after approval
    resourceMethod?: string  // HTTP method for the resource (default GET)
    resourceBody?: unknown   // body for POST resources
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  let { intent, ownerId, resourceUrl, resourceMethod = 'GET', resourceBody } = body
  if (!intent || !ownerId) {
    return NextResponse.json({ error: 'Missing intent or ownerId' }, { status: 400 })
  }

  // ── If resourceUrl given, auto-populate intent from 402 requirements ─────
  let x402Requirements: Awaited<ReturnType<typeof detectX402>>['requirements'] | undefined
  if (resourceUrl) {
    const probe = await detectX402(resourceUrl, resourceMethod, resourceBody)
    if (probe.is402 && probe.requirements) {
      x402Requirements = probe.requirements
      // Override intent amount/vendor from the actual 402 requirements
      intent = {
        ...intent,
        amount: tokenUnitsToUsdc(probe.requirements.amount),
        vendor: intent.vendor || vendorFromUrl(resourceUrl),
      }
    }
  }

  // ── Governance: consensus + policy on Soroban ────────────────────────────
  const soroban = loadSorobanConfig()
  let supabase: ReturnType<typeof createServiceRoleClient> | undefined
  try {
    supabase = createServiceRoleClient()
  } catch { /* optional */ }

  const fallbackAgentBaseUrl = process.env.SHIELDPAY_API_URL ?? 'http://localhost:4000'

  let result: Awaited<ReturnType<typeof evaluate>>
  try {
    result = await evaluate(intent, { ownerId, soroban, supabase, fallbackAgentBaseUrl })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Evaluation failed: ${msg}` }, { status: 502 })
  }

  // ── x402 path: escrow records the governance decision regardless of outcome ─
  if (resourceUrl && x402Requirements) {
    const keypair = StellarSdk.Keypair.fromSecret(soroban.operatorSecret)
    const server = new StellarSdk.rpc.Server(soroban.rpcUrl)

    // 1. Fund escrow — on-chain record of governance decision + proof funds exist
    let escrowId: string | undefined
    let escrowError: string | undefined
    try {
      escrowId = await fundEscrow(intent.amount, intent.vendor)
    } catch (err: any) {
      const body = err?.response?.data ? JSON.stringify(err.response.data) : ''
      escrowError = `Escrow fund failed: ${err instanceof Error ? err.message : err}${body ? ` — ${body}` : ''}`
      console.warn(`[settle] ${escrowError}`)
    }

    // 2. Release escrow immediately (back to operator) — audit record created
    if (escrowId) {
      try {
        await releaseEscrow(escrowId)
      } catch (err) {
        escrowError = `Escrow release failed: ${err instanceof Error ? err.message : err}`
        console.warn(`[settle] ${escrowError}`)
      }
    }

    // 3. If governance rejected — return rejection with escrow record, skip payment
    if (result.decision === 'reject') {
      return NextResponse.json(
        {
          error: result.reason ?? 'Payment rejected by consensus',
          sorobanTxId: result.sorobanTxId,
          votes: result.votes,
          escrowId,
          escrowError,
        },
        { status: 402 },
      )
    }

    // 4. Approved — x402 payment fires (escrow record exists, full liquidity restored)
    try {
      const x402Result = await fetchWithX402(
        resourceUrl,
        resourceMethod,
        resourceBody,
        keypair,
        server,
        soroban.networkPassphrase,
      )

      return NextResponse.json(
        {
          sorobanTxId: result.sorobanTxId,
          stellarTxHash: result.stellarTxHash ?? x402Result.stellarTxHash,
          decision: result.decision,
          votes: result.votes,
          escrowId,
          escrowError,
          resourceStatus: x402Result.status,
          resourceData: x402Result.data,
          x402TxHash: x402Result.stellarTxHash,
          paymentSent: x402Result.paymentSent,
        },
        { status: 200 },
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json(
        {
          sorobanTxId: result.sorobanTxId,
          stellarTxHash: result.stellarTxHash,
          decision: result.decision,
          votes: result.votes,
          escrowId,
          escrowError,
          x402Error: `x402 payment failed: ${msg}`,
        },
        { status: 200 },
      )
    }
  }

  // ── Non-x402 path: reject without escrow ────────────────────────────────
  if (result.decision === 'reject') {
    return NextResponse.json(
      {
        error: result.reason ?? 'Payment rejected by consensus',
        sorobanTxId: result.sorobanTxId,
        votes: result.votes,
      },
      { status: 402 },
    )
  }

  // ── No resourceUrl — original escrow + relayer flow ──────────────────────
  let escrowId: string | undefined
  try {
    escrowId = await fundEscrow(intent.amount, intent.vendor)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.warn(`[settle] Escrow funding skipped: ${msg}`)
  }

  return NextResponse.json(
    {
      sorobanTxId: result.sorobanTxId,
      stellarTxHash: result.stellarTxHash,
      escrowId,
      decision: result.decision,
      votes: result.votes,
    },
    { status: 200 },
  )
}
