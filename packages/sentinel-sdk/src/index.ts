import type { SupabaseClient } from '@supabase/supabase-js'
import type { PaymentIntent, EvaluationResult, SorobanConfig, RegisteredAgent } from './types.js'
import { createSorobanClient } from './soroban/client.js'
import { evaluatePolicy } from './policy/engine.js'
import { runConsensus } from './consensus/coordinator.js'
import { mirrorTransaction } from './supabase/mirror.js'

export async function verify(
  intent: PaymentIntent,
  options: { ownerId: string; soroban: SorobanConfig },
): Promise<{ allowed: boolean; reason?: string }> {
  const client = createSorobanClient(options.soroban)
  const result = await evaluatePolicy(intent, options.ownerId, client)
  return { allowed: result.allowed, reason: result.reason }
}

export async function evaluate(
  intent: PaymentIntent,
  options: { ownerId: string; soroban: SorobanConfig; supabase?: SupabaseClient; fallbackAgentBaseUrl?: string },
): Promise<EvaluationResult> {
  const client = createSorobanClient(options.soroban)

  const policyCheck = await evaluatePolicy(intent, options.ownerId, client)

  if (!policyCheck.allowed) {
    if (options.supabase) {
      await mirrorTransaction(options.supabase, {
        ownerId: options.ownerId,
        agentId: intent.agentId,
        amount: intent.amount,
        assetCode: intent.assetCode,
        vendor: intent.vendor,
        status: 'rejected',
        consensusResult: 'approved',
        policyDecision: 'rejected',
      }).catch(() => {})
    }

    return {
      decision: 'reject',
      votes: [],
      policyDecision: 'rejected',
      reason: policyCheck.reason,
    }
  }

  // Try to get consensus config from Soroban; fall back to default ShieldPay agents
  let consensusConfig: Awaited<ReturnType<typeof client.getConsensus>>
  let fallbackAgents: RegisteredAgent[] | undefined
  try {
    consensusConfig = await client.getConsensus(options.ownerId)
  } catch {
    const base = options.fallbackAgentBaseUrl ?? 'http://localhost:4000'
    consensusConfig = { quorum: 'majority', timeoutMs: 5000, agents: ['risk', 'cost', 'logic'] }
    fallbackAgents = [
      { agentId: 'risk',  type: 'shieldpay', endpoint: `${base}/api/agents/risk`,  isActive: true },
      { agentId: 'cost',  type: 'shieldpay', endpoint: `${base}/api/agents/cost`,  isActive: true },
      { agentId: 'logic', type: 'shieldpay', endpoint: `${base}/api/agents/logic`, isActive: true },
    ]
  }

  const consensusResult = await runConsensus(
    intent,
    consensusConfig,
    client,
    options.supabase,
    fallbackAgents,
  )

  return {
    decision: consensusResult.decision,
    votes: consensusResult.votes,
    policyDecision: 'approved',
    sorobanTxId: consensusResult.txId,
    stellarTxHash: consensusResult.stellarTxHash,
  }
}

export { runConsensus } from './consensus/coordinator.js'
export { evaluatePolicy } from './policy/engine.js'
export { registerAgent, getAgents, callAgent } from './consensus/registry.js'
export { evaluateQuorum } from './consensus/quorum.js'
export { createSorobanClient } from './soroban/client.js'
export { loadSorobanConfig } from './soroban/config.js'
export { mirrorAgent, mirrorConsensus, mirrorPolicy, mirrorTransaction, mirrorVotes, updateTransactionHashes } from './supabase/mirror.js'
export * from './types.js'
