/**
 * protected-agent — governance-gated payment loop.
 *
 * Same 20 × $2.50 pattern as loop-agent, but every payment goes through
 * Sentinel's evaluate() — policy check → multi-agent consensus → Soroban tx.
 *
 * Expected demo outcome: stops at iteration 3 or 4 (cumulative hits $7.50–$10
 * depending on policy's max_per_task / max_per_day thresholds).
 *
 * Run: npm run protected -w demo
 */

import { createClient } from '@supabase/supabase-js'
import { evaluate, loadSorobanConfig } from '@sentinel/sdk'
import type { PaymentIntent } from '@sentinel/sdk'

const ITERATIONS  = 20
const AMOUNT_USDC = 2.50
const VENDOR      = 'openai-api'
const AGENT_ID    = 'demo-protected-agent'
const DELAY_MS    = 500

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function usd(n: number) {
  return `$${n.toFixed(2)}`
}

async function main() {
  const ownerId    = process.env.DEMO_OWNER_ID
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!ownerId) {
    console.error('[protected-agent] DEMO_OWNER_ID is not set — must be a Stellar G-address')
    process.exit(1)
  }
  if (!ownerId.startsWith('G')) {
    console.error('[protected-agent] DEMO_OWNER_ID must be a Stellar public key (starts with G), got:', ownerId)
    process.exit(1)
  }

  const soroban = loadSorobanConfig()

  if (!soroban.contractId) {
    console.error('[protected-agent] SENTINEL_CONTRACT_ID is not set')
    process.exit(1)
  }
  if (!soroban.operatorSecret) {
    console.error('[protected-agent] SENTINEL_OPERATOR_SECRET is not set')
    process.exit(1)
  }

  const supabase = supabaseUrl && serviceKey
    ? createClient(supabaseUrl, serviceKey)
    : undefined

  if (!supabase) {
    console.warn('[protected-agent] Supabase not configured — votes will not be mirrored to the dashboard')
  }

  console.log('╔══════════════════════════════════════════╗')
  console.log('║  SENTINEL DEMO  —  PROTECTED LOOP        ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log(`  agent     : ${AGENT_ID}`)
  console.log(`  owner     : ${ownerId}`)
  console.log(`  vendor    : ${VENDOR}`)
  console.log(`  per call  : ${usd(AMOUNT_USDC)} USDC`)
  console.log(`  iterations: up to ${ITERATIONS}`)
  console.log(`  contract  : ${soroban.contractId}`)
  console.log(`  supabase  : ${supabase ? 'connected' : 'not configured'}`)
  console.log('')

  let total = 0

  for (let i = 1; i <= ITERATIONS; i++) {
    const intent: PaymentIntent = {
      agentId: AGENT_ID,
      ownerId,
      amount: AMOUNT_USDC,
      assetCode: 'USDC',
      vendor: VENDOR,
      taskDescription: `Iteration ${i} of ${ITERATIONS} — automated API call`,
    }

    console.log(`  [${i}/${ITERATIONS}] evaluating ${usd(AMOUNT_USDC)} → ${VENDOR} …`)

    let result
    try {
      result = await evaluate(intent, { ownerId, soroban, supabase })
    } catch (err) {
      console.error(`  [${i}/${ITERATIONS}] ✗  evaluate() threw:`, err)
      console.error('  Aborting.')
      process.exit(1)
    }

    if (result.decision === 'reject') {
      console.log('')
      console.log('╔══════════════════════════════════════════╗')
      console.log('║  🛑  SENTINEL BLOCKED THIS PAYMENT       ║')
      console.log('╚══════════════════════════════════════════╝')
      console.log(`  reason     : ${result.reason ?? 'no reason provided'}`)
      console.log(`  policy     : ${result.policyDecision}`)
      if (result.votes.length > 0) {
        console.log('  agent votes:')
        for (const v of result.votes) {
          const mark = v.decision === 'approve' ? '✓' : '✗'
          console.log(`    ${mark}  ${v.agentId.padEnd(24)} ${v.decision}  — ${v.reason ?? ''}`)
        }
      }
      console.log('')
      console.log(`  total spent before stop: ${usd(total)}`)
      console.log('  Check the dashboard → live block event should appear.')
      console.log('')
      process.exit(0)
    }

    // Approved
    total += AMOUNT_USDC
    const txLine = result.sorobanTxId ? `  soroban tx : ${result.sorobanTxId}` : ''

    console.log(`  [${i}/${ITERATIONS}] ✓  approved   running total: ${usd(total)}`)
    if (result.votes.length > 0) {
      const summary = result.votes.map(v => `${v.agentId}:${v.decision}`).join('  ')
      console.log(`             votes: ${summary}`)
    }
    if (txLine) console.log(txLine)

    if (i < ITERATIONS) await sleep(DELAY_MS)
  }

  // Completed all iterations without a block (policy thresholds not set tightly enough)
  console.log('')
  console.log('╔══════════════════════════════════════════╗')
  console.log(`║  DONE — total spent: ${usd(total).padEnd(20)} ║`)
  console.log('║  All iterations approved by governance.  ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log('  Tip: lower max_per_day in the Policies page to see a block.')
}

main().catch(err => {
  console.error('[protected-agent] fatal:', err)
  process.exit(1)
})
