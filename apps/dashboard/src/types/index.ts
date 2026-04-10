export interface Transaction {
  id: string
  owner_id: string
  agent_id: string
  amount: number
  asset_code: string | null
  vendor: string | null
  status: 'pending' | 'approved' | 'rejected' | 'settled'
  consensus_result: 'approved' | 'rejected' | 'timeout' | null
  policy_decision: 'approved' | 'rejected' | null
  escrow_contract_id: string | null
  soroban_tx_id: string | null
  tx_hash: string | null
  error: string | null
  created_at: string
}

export interface Vote {
  id: string
  transaction_id: string
  agent_id: string
  decision: 'approve' | 'reject'
  reason: string | null
  latency_ms: number | null
  created_at: string
}

export interface RegisteredAgent {
  id: string
  owner_id: string
  agent_id: string
  type: 'shieldpay' | 'custom'
  endpoint: string | null
  description: string | null
  is_active: boolean
  created_at: string
}

export interface MppSession {
  id: string
  session_id: string
  owner_id: string
  agent_id: string
  total_charged: number
  status: 'active' | 'closed' | 'killed'
  kill_reason: string | null
  opened_at: string | null
  closed_at: string | null
  created_at: string
  updated_at: string
}
