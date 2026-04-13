/**
 * POST /api/me/setup-account
 *
 * Called once per new user (from the dashboard profile route via service key).
 * Does five things:
 *   1. Sends 100 USDC from the platform operator to the new user (Horizon)
 *   2. Registers the three default ShieldPay agents on Soroban for this owner
 *   3. Sets a default spending policy on Soroban and mirrors it to Supabase
 *   4. Sets majority-quorum consensus config on Soroban and mirrors it to Supabase
 *
 * All steps are non-fatal individually — partial success is returned with an
 * `errors` array so the onboarding flow can continue.
 */

import { NextRequest, NextResponse } from 'next/server'
import * as StellarSdk from '@stellar/stellar-sdk'
import { registerAgent, loadSorobanConfig, createSorobanClient, mirrorAgent, mirrorPolicy, mirrorConsensus } from '@oppialabs/sentinel-sdk'
import { createServiceRoleClient } from '../../../../lib/supabase/server'
import { validateApiKey, unauthorizedResponse } from '../../../../lib/auth/api-key'

const USDC_ISSUER = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
const USDC_AMOUNT = '100'

export async function POST(req: NextRequest) {
  const ownerId = await validateApiKey(req)
  if (!ownerId) return unauthorizedResponse()

  const errors: string[] = []

  // ── 1. Send 100 USDC from operator to user ─────────────────────────────────
  try {
    const horizonUrl        = process.env.STELLAR_HORIZON_URL ?? 'https://horizon-testnet.stellar.org'
    const networkPassphrase = process.env.STELLAR_NETWORK_PASSPHRASE ?? StellarSdk.Networks.TESTNET
    const operatorSecret    = process.env.SENTINEL_OPERATOR_SECRET ?? ''

    if (!operatorSecret) throw new Error('SENTINEL_OPERATOR_SECRET not configured')

    const operatorKeypair = StellarSdk.Keypair.fromSecret(operatorSecret)
    const horizon         = new StellarSdk.Horizon.Server(horizonUrl)
    const USDC            = new StellarSdk.Asset('USDC', USDC_ISSUER)

    let attempts = 0
    while (attempts < 3) {
      try {
        const operatorAccount = await horizon.loadAccount(operatorKeypair.publicKey())

        const tx = new StellarSdk.TransactionBuilder(operatorAccount, {
          fee: StellarSdk.BASE_FEE,
          networkPassphrase,
        })
          .addOperation(
            StellarSdk.Operation.payment({
              destination: ownerId,
              asset: USDC,
              amount: USDC_AMOUNT,
            }),
          )
          .setTimeout(30)
          .build()

        tx.sign(operatorKeypair)
        await horizon.submitTransaction(tx)
        break
      } catch (err) {
        attempts++
        const msg = JSON.stringify(err)
        if (attempts < 3 && (msg.includes('tx_bad_seq') || msg.includes('bad_seq'))) {
          await new Promise(r => setTimeout(r, 500 * attempts))
          continue
        }
        throw err
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`USDC funding: ${msg}`)
    console.warn('[setup-account] USDC funding failed:', msg)
  }

  // ── 2 & 3. Register 3 agents + set consensus on Soroban ────────────────────
  try {
    const soroban  = loadSorobanConfig()
    const client   = createSorobanClient(soroban)
    const supabase = createServiceRoleClient()
    const apiBase  = process.env.SHIELDPAY_API_URL ?? 'http://localhost:4000'

    const defaultAgents = [
      {
        agentId:     'risk',
        endpoint:    `${apiBase}/api/agents/risk`,
        description: 'Risk detection — retry storms & velocity anomalies',
      },
      {
        agentId:     'cost',
        endpoint:    `${apiBase}/api/agents/cost`,
        description: 'Cost enforcement — daily/hourly/per-tx caps',
      },
      {
        agentId:     'logic',
        endpoint:    `${apiBase}/api/agents/logic`,
        description: 'Logic validation — LLM semantic reasoning',
      },
    ]

    for (const agent of defaultAgents) {
      try {
        await registerAgent(
          ownerId,
          { agentId: agent.agentId, type: 'shieldpay', endpoint: agent.endpoint, description: agent.description },
          client,
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        // Skip if already registered (AlreadyExists is error code #4 in Soroban)
        if (!msg.includes('AlreadyExists') && !msg.includes('#4') && !msg.includes('already')) {
          throw err
        }
      }

      await mirrorAgent(supabase, ownerId, {
        agentId:     agent.agentId,
        type:        'shieldpay',
        endpoint:    agent.endpoint,
        description: agent.description,
        isActive:    true,
      }).catch(() => {})
    }

    // Set policy on Soroban so on-chain enforcement matches the mirrored defaults
    const defaultPolicy = {
      maxPerTask:     50  * 10_000_000,
      maxPerHour:     100 * 10_000_000,
      maxPerDay:      500 * 10_000_000,
      blockedVendors: [] as string[],
      alertThreshold: 10  * 10_000_000,
    }
    await client.setPolicy(ownerId, defaultPolicy)

    // Mirror policy to Supabase (idempotent — upserts on owner_id)
    await mirrorPolicy(supabase, ownerId, {
      max_per_task:    50,
      max_per_hour:    100,
      max_per_day:     500,
      blocked_vendors: [],
      alert_threshold: 10,
    }).catch(() => {})

    // Set consensus on Soroban: majority quorum, all 3 agents, 5s timeout
    const consensusConfig = {
      quorum: 'majority' as const,
      timeoutMs: 5000,
      agentIds: ['risk', 'cost', 'logic'],
    }
    await client.setConsensus(ownerId, consensusConfig)

    // Mirror consensus config to Supabase
    await mirrorConsensus(supabase, ownerId, consensusConfig).catch(() => {})
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`Soroban setup: ${msg}`)
    console.warn('[setup-account] Soroban setup failed:', msg)
  }

  return NextResponse.json({ ok: true, ...(errors.length ? { errors } : {}) })
}
