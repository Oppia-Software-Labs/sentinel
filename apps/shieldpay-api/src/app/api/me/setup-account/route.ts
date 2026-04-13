/**
 * POST /api/me/setup-account
 *
 * Called once per new user (from the dashboard profile route via service key).
 * Does four things:
 *   1. Sends 100 USDC from the platform operator to the new user (Horizon)
 *   2. Registers the three default ShieldPay agents on Soroban for this owner
 *   3. Seeds a default spending policy in Supabase
 *   4. Sets majority-quorum consensus config on Soroban for this owner
 *
 * All steps are non-fatal individually — partial success is returned with an
 * `errors` array so the onboarding flow can continue.
 */

import { NextRequest, NextResponse } from 'next/server'
import * as StellarSdk from '@stellar/stellar-sdk'
import { registerAgent, loadSorobanConfig, createSorobanClient, mirrorAgent, mirrorPolicy } from '@sentinel/sdk'
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
    const operatorAccount = await horizon.loadAccount(operatorKeypair.publicKey())
    const USDC            = new StellarSdk.Asset('USDC', USDC_ISSUER)

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

    // Seed default policy (idempotent — upserts on owner_id)
    await mirrorPolicy(supabase, ownerId, {
      max_per_task:    50,
      max_per_hour:    100,
      max_per_day:     500,
      blocked_vendors: [],
      alert_threshold: 10,
    }).catch(() => {})

    // Set consensus: majority quorum, all 3 agents, 5s timeout
    const { rpcUrl, networkPassphrase, contractId, operatorSecret } = soroban
    if (contractId && operatorSecret) {
      const keypair   = StellarSdk.Keypair.fromSecret(operatorSecret)
      const rpcServer = new StellarSdk.rpc.Server(rpcUrl)
      const contract  = new StellarSdk.Contract(contractId)

      const configScVal = StellarSdk.xdr.ScVal.scvMap([
        new StellarSdk.xdr.ScMapEntry({
          key: StellarSdk.xdr.ScVal.scvSymbol('agent_ids'),
          val: StellarSdk.xdr.ScVal.scvVec(
            ['risk', 'cost', 'logic'].map(id => StellarSdk.xdr.ScVal.scvSymbol(id)),
          ),
        }),
        new StellarSdk.xdr.ScMapEntry({
          key: StellarSdk.xdr.ScVal.scvSymbol('quorum'),
          val: StellarSdk.xdr.ScVal.scvSymbol('majority'),
        }),
        new StellarSdk.xdr.ScMapEntry({
          key: StellarSdk.xdr.ScVal.scvSymbol('timeout_ms'),
          val: StellarSdk.nativeToScVal(5000, { type: 'u32' }),
        }),
      ])

      const account = await rpcServer.getAccount(keypair.publicKey())
      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: '1000000',
        networkPassphrase,
      })
        .addOperation(
          contract.call(
            'set_consensus',
            new StellarSdk.Address(ownerId).toScVal(),
            configScVal,
          ),
        )
        .setTimeout(30)
        .build()

      const prepared = await rpcServer.prepareTransaction(tx)
      prepared.sign(keypair)
      const sent = await rpcServer.sendTransaction(prepared)

      if (sent.status !== 'ERROR') {
        // Wait for confirmation (up to 15s)
        let txResult = await rpcServer.getTransaction(sent.hash)
        for (let i = 0; i < 15 && txResult.status === StellarSdk.rpc.Api.GetTransactionStatus.NOT_FOUND; i++) {
          await new Promise(r => setTimeout(r, 1000))
          txResult = await rpcServer.getTransaction(sent.hash)
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push(`Soroban setup: ${msg}`)
    console.warn('[setup-account] Soroban setup failed:', msg)
  }

  return NextResponse.json({ ok: true, ...(errors.length ? { errors } : {}) })
}
