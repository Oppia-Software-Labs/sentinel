/**
 * One-time setup script: initializes Soroban on-chain state for the owner.
 *
 * What it does:
 *   1. Derives the owner G-address from SENTINEL_OPERATOR_SECRET
 *   2. Sets the spend policy (unlimited — matches the off-chain default)
 *   3. Registers the three ShieldPay governance agents (risk, cost, logic)
 *   4. Configures majority-quorum consensus over those three agents
 *
 * Usage:
 *   tsc --project scripts/tsconfig.json
 *   node scripts/dist/setup-soroban.js
 *
 * Or compile + run in one step (requires ts-node or tsx):
 *   npx tsx scripts/setup-soroban.ts
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import * as StellarSdk from '@stellar/stellar-sdk'

// ── Load .env ────────────────────────────────────────────────────────────────

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../../apps/shieldpay-api/.env')

function loadEnv(filePath: string): Record<string, string> {
  const env: Record<string, string> = {}
  if (!fs.existsSync(filePath)) return env
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    env[key] = val
  }
  return env
}

const env = loadEnv(envPath)

const RPC_URL       = env.STELLAR_RPC_URL            ?? 'https://soroban-testnet.stellar.org'
const PASSPHRASE    = env.STELLAR_NETWORK_PASSPHRASE  ?? 'Test SDF Network ; September 2015'
const CONTRACT_ID   = env.SENTINEL_CONTRACT_ID        ?? ''
const OP_SECRET     = env.SENTINEL_OPERATOR_SECRET    ?? ''
const API_BASE      = 'http://localhost:4000'

if (!CONTRACT_ID) throw new Error('SENTINEL_CONTRACT_ID is not set in apps/shieldpay-api/.env')
if (!OP_SECRET)   throw new Error('SENTINEL_OPERATOR_SECRET is not set in apps/shieldpay-api/.env')

const keypair      = StellarSdk.Keypair.fromSecret(OP_SECRET)
const ownerAddress = keypair.publicKey()

console.log('Owner address :', ownerAddress)
console.log('Contract      :', CONTRACT_ID)
console.log('RPC            :', RPC_URL)
console.log()

// ── Soroban helpers ──────────────────────────────────────────────────────────

const server   = new StellarSdk.rpc.Server(RPC_URL)
const contract = new StellarSdk.Contract(CONTRACT_ID)
const BASE_FEE = '1000000'
const TIMEOUT  = 30

async function submitTx(op: StellarSdk.xdr.Operation): Promise<string> {
  const account  = await server.getAccount(ownerAddress)
  const tx       = new StellarSdk.TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: PASSPHRASE })
    .addOperation(op)
    .setTimeout(TIMEOUT)
    .build()

  const prepared = await server.prepareTransaction(tx)
  prepared.sign(keypair)

  const send = await server.sendTransaction(prepared)
  if (send.status === 'ERROR') {
    throw new Error(`Submit failed: ${send.errorResult?.toXDR('base64')}`)
  }

  let result = await server.getTransaction(send.hash)
  while (result.status === StellarSdk.rpc.Api.GetTransactionStatus.NOT_FOUND) {
    await new Promise(r => setTimeout(r, 1000))
    result = await server.getTransaction(send.hash)
  }

  if (result.status === StellarSdk.rpc.Api.GetTransactionStatus.FAILED) {
    throw new Error('Transaction failed on-chain')
  }

  return send.hash
}

// ── 1. Set policy ────────────────────────────────────────────────────────────

// 1 billion USDC in stroops (10^7 stroops per USDC) — effectively unlimited for demo
const UNLIMITED = 1_000_000_000n * 10_000_000n

function i128Val(n: bigint): StellarSdk.xdr.ScVal {
  return StellarSdk.nativeToScVal(n, { type: 'i128' })
}

async function setPolicy(): Promise<void> {
  console.log('Setting policy (1B USDC caps = unlimited for demo)...')

  const rulesScVal = StellarSdk.xdr.ScVal.scvMap([
    new StellarSdk.xdr.ScMapEntry({
      key: StellarSdk.xdr.ScVal.scvSymbol('alert_threshold'),
      val: i128Val(UNLIMITED),
    }),
    new StellarSdk.xdr.ScMapEntry({
      key: StellarSdk.xdr.ScVal.scvSymbol('blocked_vendors'),
      val: StellarSdk.xdr.ScVal.scvVec([]),
    }),
    new StellarSdk.xdr.ScMapEntry({
      key: StellarSdk.xdr.ScVal.scvSymbol('max_per_day'),
      val: i128Val(UNLIMITED),
    }),
    new StellarSdk.xdr.ScMapEntry({
      key: StellarSdk.xdr.ScVal.scvSymbol('max_per_hour'),
      val: i128Val(UNLIMITED),
    }),
    new StellarSdk.xdr.ScMapEntry({
      key: StellarSdk.xdr.ScVal.scvSymbol('max_per_task'),
      val: i128Val(UNLIMITED),
    }),
  ])

  const op   = contract.call('set_policy', new StellarSdk.Address(ownerAddress).toScVal(), rulesScVal)
  const hash = await submitTx(op)
  console.log('  ✓ policy set  tx:', hash)
}

// ── 2. Register agents ───────────────────────────────────────────────────────

const AGENTS = [
  { id: 'risk',  endpoint: `${API_BASE}/api/agents/risk`,  description: 'Risk agent — detects loops and velocity anomalies' },
  { id: 'cost',  endpoint: `${API_BASE}/api/agents/cost`,  description: 'Cost agent — enforces budget caps' },
  { id: 'logic', endpoint: `${API_BASE}/api/agents/logic`, description: 'Logic agent — LLM semantic reasoning (Claude Haiku)' },
]

async function registerAgent(id: string, endpoint: string, description: string): Promise<void> {
  console.log(`Registering agent "${id}"...`)

  const infoScVal = StellarSdk.xdr.ScVal.scvMap([
    new StellarSdk.xdr.ScMapEntry({
      key: StellarSdk.xdr.ScVal.scvSymbol('agent_type'),
      val: StellarSdk.xdr.ScVal.scvSymbol('shieldpay'),
    }),
    new StellarSdk.xdr.ScMapEntry({
      key: StellarSdk.xdr.ScVal.scvSymbol('description'),
      val: StellarSdk.xdr.ScVal.scvString(description),
    }),
    new StellarSdk.xdr.ScMapEntry({
      key: StellarSdk.xdr.ScVal.scvSymbol('endpoint'),
      val: StellarSdk.xdr.ScVal.scvString(endpoint),
    }),
    new StellarSdk.xdr.ScMapEntry({
      key: StellarSdk.xdr.ScVal.scvSymbol('is_active'),
      val: StellarSdk.xdr.ScVal.scvBool(true),
    }),
  ])

  const op   = contract.call(
    'register_agent',
    new StellarSdk.Address(ownerAddress).toScVal(),
    StellarSdk.nativeToScVal(id, { type: 'symbol' }),
    infoScVal,
  )
  try {
    const hash = await submitTx(op)
    console.log(`  ✓ agent "${id}" registered  tx:`, hash)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('#4') || msg.includes('AlreadyExists')) {
      console.log(`  ↩ agent "${id}" already registered — skipping`)
    } else {
      throw err
    }
  }
}

// ── 3. Set consensus ─────────────────────────────────────────────────────────

async function setConsensus(): Promise<void> {
  console.log('Setting consensus (majority, agents: risk + cost + logic)...')

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

  const op   = contract.call('set_consensus', new StellarSdk.Address(ownerAddress).toScVal(), configScVal)
  const hash = await submitTx(op)
  console.log('  ✓ consensus set  tx:', hash)
}

// ── Run ───────────────────────────────────────────────────────────────────────

try {
  await setPolicy()
  for (const { id, endpoint, description } of AGENTS) {
    await registerAgent(id, endpoint, description)
  }
  await setConsensus()

  console.log()
  console.log('All done. On-chain state initialized for', ownerAddress)
  console.log('Real Soroban transaction IDs are printed above.')
} catch (err) {
  console.error('Setup failed:', err instanceof Error ? err.message : err)
  process.exit(1)
}
