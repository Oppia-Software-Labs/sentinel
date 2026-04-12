import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgentVote } from '../types.js'

interface TransactionMirror {
  ownerId: string
  agentId: string
  amount: number
  assetCode: string
  vendor: string
  status: 'pending' | 'approved' | 'rejected' | 'settled'
  consensusResult: 'approved' | 'rejected' | 'timeout'
  policyDecision: 'approved' | 'rejected'
  sorobanTxId?: string
  stellarTxHash?: string
}

export async function mirrorTransaction(
  supabase: SupabaseClient,
  data: TransactionMirror,
): Promise<string | null> {
  const { data: row, error } = await supabase
    .from('transactions')
    .insert({
      owner_id: data.ownerId,
      agent_id: data.agentId,
      amount: data.amount,
      asset_code: data.assetCode,
      vendor: data.vendor,
      status: data.status,
      consensus_result: data.consensusResult,
      policy_decision: data.policyDecision,
      soroban_tx_id: data.sorobanTxId,
      stellar_tx_hash: data.stellarTxHash,
    })
    .select('id')
    .single()

  if (error) return null
  return row?.id ?? null
}

export async function mirrorVotes(
  supabase: SupabaseClient,
  sorobanTxId: string,
  votes: AgentVote[],
): Promise<void> {
  const { data: tx } = await supabase
    .from('transactions')
    .select('id')
    .eq('soroban_tx_id', sorobanTxId)
    .single()

  if (!tx?.id) return

  const rows = votes.map(v => ({
    transaction_id: tx.id,
    agent_id: v.agentId,
    decision: v.decision,
    reason: v.reason,
  }))

  await supabase.from('votes').insert(rows)
}

export async function updateTransactionHashes(
  supabase: SupabaseClient,
  sorobanTxId: string,
  update: {
    status?: 'approved' | 'rejected' | 'settled'
    escrowContractId?: string
    paymentTxHash?: string
  },
): Promise<void> {
  const patch: Record<string, unknown> = {}
  if (update.status !== undefined) patch.status = update.status
  if (update.escrowContractId !== undefined) patch.escrow_contract_id = update.escrowContractId
  if (update.paymentTxHash !== undefined) patch.payment_tx_hash = update.paymentTxHash
  if (Object.keys(patch).length === 0) return

  await supabase
    .from('transactions')
    .update(patch)
    .eq('soroban_tx_id', sorobanTxId)
}

export async function mirrorPolicy(
  supabase: SupabaseClient,
  ownerId: string,
  rules: Record<string, unknown>,
): Promise<void> {
  await supabase
    .from('policies')
    .upsert(
      { owner_id: ownerId, rules, updated_at: new Date().toISOString() },
      { onConflict: 'owner_id' },
    )
}

export async function mirrorAgent(
  supabase: SupabaseClient,
  ownerId: string,
  agent: {
    agentId: string
    type: 'shieldpay' | 'custom' | 'hosted'
    endpoint?: string
    description?: string
    isActive: boolean
  },
): Promise<void> {
  await supabase
    .from('registered_agents')
    .upsert(
      {
        owner_id: ownerId,
        agent_id: agent.agentId,
        type: agent.type,
        endpoint: agent.endpoint,
        description: agent.description,
        is_active: agent.isActive,
      },
      { onConflict: 'agent_id' },
    )
}
