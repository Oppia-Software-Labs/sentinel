import type { SupabaseClient } from '@supabase/supabase-js'
import type { SorobanClient } from '../soroban/client.js'
import type { PaymentIntent, AgentVote, ConsensusConfig, RegisteredAgent } from '../types.js'
import { getAgents, callAgent } from './registry.js'
import { mirrorTransaction, mirrorVotes } from '../supabase/mirror.js'

export interface ConsensusResult {
  decision: 'approve' | 'reject'
  votes: AgentVote[]
  txId: string
  stellarTxHash: string
}

export async function runConsensus(
  intent: PaymentIntent,
  config: ConsensusConfig,
  sorobanClient: SorobanClient,
  supabase?: SupabaseClient,
  fallbackAgents?: RegisteredAgent[],
): Promise<ConsensusResult> {
  let agents: RegisteredAgent[] = []
  try {
    agents = await getAgents(intent.ownerId, sorobanClient)
  } catch {
    // Soroban agent registry not initialized — will use fallback agents below
  }

  const configuredAgentIds = new Set(config.agents)
  let activeAgents = agents.filter(a => configuredAgentIds.has(a.agentId) && a.isActive)

  // If ID filter yielded nothing (agent_id not in struct), use all active on-chain agents
  if (activeAgents.length === 0 && agents.some(a => a.isActive)) {
    activeAgents = agents.filter(a => a.isActive)
  }

  // If still nothing, fall back to provided defaults
  if (activeAgents.length === 0 && fallbackAgents && fallbackAgents.length > 0) {
    activeAgents = fallbackAgents.filter(a => a.isActive)
  }

  let tracker = { dayTotal: 0, hourTotal: 0 }
  try {
    const raw = await sorobanClient.getSpendTracker(intent.ownerId)
    tracker = { dayTotal: raw.dayTotal, hourTotal: raw.hourTotal }
  } catch {
    // Spend tracker not available — default to zero
  }
  // Spend tracker values are in stroops (1 USDC = 10_000_000 stroops) — convert to USDC for agents
  const context = {
    totalSpentToday: tracker.dayTotal / 10_000_000,
    totalSpentHour: tracker.hourTotal / 10_000_000,
  }

  const votePromises = activeAgents.map(async (agent) => {
    if (!agent.endpoint) {
      return {
        agentId: agent.agentId,
        decision: 'reject' as const,
        reason: 'no endpoint configured',
      }
    }

    const vote = await callAgent(agent.endpoint, intent, context, config.timeoutMs)
    return { ...vote, agentId: agent.agentId }
  })

  const settledResults = await Promise.allSettled(votePromises)

  const votes: AgentVote[] = settledResults.map((result, idx) => {
    if (result.status === 'fulfilled') {
      return result.value
    }
    return {
      agentId: activeAgents[idx]?.agentId ?? 'unknown',
      decision: 'reject' as const,
      reason: `agent error: ${result.reason}`,
    }
  })

  let verdict: Awaited<ReturnType<typeof sorobanClient.evaluate>>
  try {
    verdict = await sorobanClient.evaluate(intent.ownerId, intent, votes)
  } catch {
    // Soroban evaluate not available (on-chain state not initialized) — run quorum locally
    const { evaluateQuorum } = await import('./quorum.js')
    const localDecision = evaluateQuorum(votes, config.quorum)
    const fallbackTxId = `offchain-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    verdict = {
      txId: fallbackTxId,
      stellarTxHash: '',
      decision: localDecision,
      consensusResult: localDecision,
      policyDecision: 'approve',
      amount: intent.amount,
      vendor: intent.vendor,
      timestamp: Date.now(),
    }
  }

  if (supabase) {
    await mirrorTransaction(supabase, {
      ownerId: intent.ownerId,
      agentId: intent.agentId,
      amount: intent.amount,
      assetCode: intent.assetCode,
      vendor: intent.vendor,
      status: verdict.decision === 'approve' ? 'approved' : 'rejected',
      consensusResult: verdict.consensusResult === 'approve' ? 'approved' : 'rejected',
      policyDecision: verdict.policyDecision === 'approve' ? 'approved' : 'rejected',
      sorobanTxId: verdict.txId,
      stellarTxHash: verdict.stellarTxHash,
    }).catch(() => {})

    await mirrorVotes(supabase, verdict.txId, votes).catch(() => {})
  }

  return {
    decision: verdict.decision,
    votes,
    txId: verdict.txId,
    stellarTxHash: verdict.stellarTxHash,
  }
}
