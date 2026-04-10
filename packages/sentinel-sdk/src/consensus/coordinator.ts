import type { SupabaseClient } from '@supabase/supabase-js'
import type { SorobanClient } from '../soroban/client.js'
import type { PaymentIntent, AgentVote, ConsensusConfig } from '../types.js'
import { getAgents, callAgent } from './registry.js'
import { mirrorTransaction, mirrorVotes } from '../supabase/mirror.js'

export interface ConsensusResult {
  decision: 'approve' | 'reject'
  votes: AgentVote[]
  txId: string
}

export async function runConsensus(
  intent: PaymentIntent,
  config: ConsensusConfig,
  sorobanClient: SorobanClient,
  supabase?: SupabaseClient,
): Promise<ConsensusResult> {
  const agents = await getAgents(intent.ownerId, sorobanClient)

  const configuredAgentIds = new Set(config.agents)
  const activeAgents = agents.filter(a => configuredAgentIds.has(a.agentId) && a.isActive)

  const tracker = await sorobanClient.getSpendTracker(intent.ownerId)
  const context = {
    totalSpentToday: tracker.dayTotal,
    totalSpentHour: tracker.hourTotal,
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

  const verdict = await sorobanClient.evaluate(intent.ownerId, intent, votes)

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
    }).catch(() => {})

    await mirrorVotes(supabase, verdict.txId, votes).catch(() => {})
  }

  return {
    decision: verdict.decision,
    votes,
    txId: verdict.txId,
  }
}
