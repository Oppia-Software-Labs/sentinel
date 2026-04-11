/**
 * loop-agent — unprotected payment loop.
 *
 * Fires 20 × $2.50 payments to openai-api with NO governance.
 * Shows what happens when an AI agent spends freely: $50 gone, no stops.
 *
 * Run: npm run loop -w demo
 */

const ITERATIONS  = 20
const AMOUNT_USDC = 2.50
const VENDOR      = 'openai-api'
const AGENT_ID    = 'demo-loop-agent'
const DELAY_MS    = 500

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function usd(n: number) {
  return `$${n.toFixed(2)}`
}

async function main() {
  const relayerUrl = process.env.OZ_RELAYER_URL
  if (!relayerUrl) {
    console.error('[loop-agent] OZ_RELAYER_URL is not set — set it in .env')
    process.exit(1)
  }

  console.log('╔══════════════════════════════════════════╗')
  console.log('║  SENTINEL DEMO  —  UNPROTECTED LOOP      ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log(`  agent     : ${AGENT_ID}`)
  console.log(`  vendor    : ${VENDOR}`)
  console.log(`  per call  : ${usd(AMOUNT_USDC)} USDC`)
  console.log(`  iterations: ${ITERATIONS}`)
  console.log(`  relayer   : ${relayerUrl}`)
  console.log('')

  let total = 0

  for (let i = 1; i <= ITERATIONS; i++) {
    const res = await fetch(`${relayerUrl}/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        vendor: VENDOR,
        amount: AMOUNT_USDC,
        assetCode: 'USDC',
      }),
    }).catch((err: Error) => {
      console.error(`  [${i}/${ITERATIONS}] network error: ${err.message}`)
      return null
    })

    total += AMOUNT_USDC

    if (res && res.ok) {
      console.log(`  [${i}/${ITERATIONS}] ✓  paid ${usd(AMOUNT_USDC)} to ${VENDOR}   running total: ${usd(total)}`)
    } else {
      const status = res ? res.status : 'ERR'
      console.log(`  [${i}/${ITERATIONS}] ✗  HTTP ${status}   running total: ${usd(total)}`)
    }

    if (i < ITERATIONS) await sleep(DELAY_MS)
  }

  console.log('')
  console.log('╔══════════════════════════════════════════╗')
  console.log(`║  DONE — total spent: ${usd(total).padEnd(20)} ║`)
  console.log('║  No governance. No stops. Money gone.    ║')
  console.log('╚══════════════════════════════════════════╝')
}

main().catch(err => {
  console.error('[loop-agent] fatal:', err)
  process.exit(1)
})
