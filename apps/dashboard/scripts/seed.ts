/**
 * Seed mock data into Supabase for dashboard development.
 * Run with: npx tsx --env-file .env scripts/seed.ts
 */
import { createClient } from '@supabase/supabase-js'

const OWNER_ID = process.env.NEXT_PUBLIC_OWNER_ID
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!OWNER_ID || !SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing env vars — copy .env.example to .env and fill in values.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ─── helpers ────────────────────────────────────────────────────────────────

function minsAgo(n: number) {
  return new Date(Date.now() - n * 60_000).toISOString()
}

function rand(min: number, max: number) {
  return +(Math.random() * (max - min) + min).toFixed(2)
}

// ─── transactions + votes ───────────────────────────────────────────────────

const TX_ROWS = [
  // Normal settled transactions
  { agent_id: 'demo-agent-1', amount: 2.50,  vendor: 'openai-api',      status: 'settled',  consensus_result: 'approved', policy_decision: 'approved', created_at: minsAgo(2)  },
  { agent_id: 'demo-agent-1', amount: 2.50,  vendor: 'openai-api',      status: 'settled',  consensus_result: 'approved', policy_decision: 'approved', created_at: minsAgo(4)  },
  { agent_id: 'demo-agent-1', amount: 2.50,  vendor: 'openai-api',      status: 'settled',  consensus_result: 'approved', policy_decision: 'approved', created_at: minsAgo(6)  },
  // Rejected by consensus (risk agent detected loop)
  { agent_id: 'demo-agent-1', amount: 2.50,  vendor: 'openai-api',      status: 'rejected', consensus_result: 'rejected', policy_decision: 'approved', created_at: minsAgo(8)  },
  // Rejected by policy (vendor blocked)
  { agent_id: 'demo-agent-2', amount: 50.00, vendor: 'blocked-vendor',   status: 'rejected', consensus_result: 'approved', policy_decision: 'rejected', created_at: minsAgo(12) },
  // Rejected by policy (max_per_task exceeded)
  { agent_id: 'demo-agent-2', amount: 99.99, vendor: 'anthropic-api',    status: 'rejected', consensus_result: 'approved', policy_decision: 'rejected', created_at: minsAgo(20) },
  // More settled
  { agent_id: 'demo-agent-3', amount: 1.00,  vendor: 'perplexity-api',   status: 'settled',  consensus_result: 'approved', policy_decision: 'approved', created_at: minsAgo(30) },
  { agent_id: 'demo-agent-3', amount: 3.75,  vendor: 'perplexity-api',   status: 'settled',  consensus_result: 'approved', policy_decision: 'approved', created_at: minsAgo(45) },
  // Pending
  { agent_id: 'demo-agent-1', amount: 2.50,  vendor: 'openai-api',      status: 'pending',  consensus_result: null,       policy_decision: null,       created_at: minsAgo(1)  },
]

const VOTE_TEMPLATES: Record<string, { decision: 'approve' | 'reject'; reason: string }[]> = {
  approved: [
    { decision: 'approve', reason: 'No anomalies detected in request pattern.' },
    { decision: 'approve', reason: 'Within hourly and daily spending limits.' },
    { decision: 'approve', reason: 'Vendor is recognized and task is coherent.' },
  ],
  'consensus-rejected': [
    { decision: 'reject', reason: 'Retry storm detected — 8 identical requests in 60s.' },
    { decision: 'approve', reason: 'Within spending limits.' },
    { decision: 'approve', reason: 'Vendor and task appear valid.' },
  ],
}

async function seedTransactions() {
  console.log('Seeding transactions…')

  for (const tx of TX_ROWS) {
    const { data, error } = await supabase
      .from('transactions')
      .insert({ ...tx, owner_id: OWNER_ID, asset_code: 'USDC' })
      .select('id')
      .single()

    if (error) {
      console.error(`  ✗ Failed to insert tx (${tx.vendor}):`, error.message)
      continue
    }

    console.log(`  ✓ tx ${data.id.slice(0, 8)}… — ${tx.agent_id} → ${tx.vendor} $${tx.amount} [${tx.status}]`)

    // Insert votes for non-pending transactions
    if (tx.status !== 'pending' && tx.consensus_result !== null) {
      const template =
        tx.consensus_result === 'rejected' ? VOTE_TEMPLATES['consensus-rejected'] : VOTE_TEMPLATES['approved']

      const votes = template.map((v, i) => ({
        transaction_id: data.id,
        agent_id: ['risk', 'cost', 'logic'][i],
        decision: v.decision,
        reason: v.reason,
        latency_ms: Math.floor(Math.random() * 80) + 15,
      }))

      const { error: voteError } = await supabase.from('votes').insert(votes)
      if (voteError) {
        console.error(`    ✗ Votes failed:`, voteError.message)
      } else {
        console.log(`    ✓ ${votes.length} votes inserted`)
      }
    }
  }
}

// ─── MPP sessions ────────────────────────────────────────────────────────────

async function seedMppSessions() {
  console.log('Seeding MPP sessions…')

  const sessions = [
    {
      session_id: `demo-session-${Date.now()}-1`,
      agent_id: 'demo-agent-1',
      total_charged: rand(1, 10),
      status: 'active',
      opened_at: minsAgo(5),
    },
    {
      session_id: `demo-session-${Date.now()}-2`,
      agent_id: 'demo-agent-3',
      total_charged: rand(5, 20),
      status: 'active',
      opened_at: minsAgo(15),
    },
    {
      session_id: `demo-session-${Date.now()}-3`,
      agent_id: 'demo-agent-2',
      total_charged: rand(20, 80),
      status: 'killed',
      kill_reason: 'Spend limit exceeded ($100 cap)',
      opened_at: minsAgo(60),
      closed_at: minsAgo(30),
    },
  ]

  for (const s of sessions) {
    const { error } = await supabase
      .from('mpp_sessions')
      .insert({ ...s, owner_id: OWNER_ID })

    if (error) {
      console.error(`  ✗ Session ${s.session_id}:`, error.message)
    } else {
      console.log(`  ✓ session ${s.agent_id} [${s.status}]`)
    }
  }
}

// ─── Policy ──────────────────────────────────────────────────────────────────

async function seedPolicy() {
  console.log('Seeding policy…')

  const rules = {
    max_per_task:    '50000000',   // $5 USDC
    max_per_hour:    '500000000',  // $50 USDC
    max_per_day:     '2000000000', // $200 USDC
    alert_threshold: '100000000',  // $10 USDC
    blocked_vendors: ['blocked-vendor', 'evil-api'],
  }

  const { error } = await supabase
    .from('policies')
    .upsert({ owner_id: OWNER_ID, rules, updated_at: new Date().toISOString() })

  if (error) {
    console.error('  ✗ Policy:', error.message)
  } else {
    console.log('  ✓ Policy seeded')
  }
}

// ─── Registered agents ───────────────────────────────────────────────────────

async function seedAgents() {
  console.log('Seeding agents…')

  const agents = [
    { agent_id: 'risk',  type: 'shieldpay', endpoint: 'http://localhost:4000/api/agents/risk',  description: 'Detects loops, retry storms, anomalous patterns',  is_active: true  },
    { agent_id: 'cost',  type: 'shieldpay', endpoint: 'http://localhost:4000/api/agents/cost',  description: 'Enforces per-task, per-hour, per-day spend caps',  is_active: true  },
    { agent_id: 'logic', type: 'shieldpay', endpoint: 'http://localhost:4000/api/agents/logic', description: 'Validates vendor, asset code, task coherence',        is_active: true  },
  ]

  for (const a of agents) {
    const { error } = await supabase
      .from('registered_agents')
      .upsert({ ...a, owner_id: OWNER_ID }, { onConflict: 'agent_id' })

    if (error) {
      console.error(`  ✗ Agent ${a.agent_id}:`, error.message)
    } else {
      console.log(`  ✓ Agent ${a.agent_id} [${a.type}]`)
    }
  }
}

// ─── Run ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\nSeeding Supabase for owner: ${OWNER_ID}\n`)
  await seedPolicy()
  await seedAgents()
  await seedTransactions()
  await seedMppSessions()
  console.log('\nDone. Refresh the dashboard.\n')
}

main().catch((e) => { console.error(e); process.exit(1) })
