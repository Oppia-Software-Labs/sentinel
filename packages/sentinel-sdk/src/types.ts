export interface PaymentIntent {
  agentId: string
  ownerId: string
  amount: number
  assetCode: string
  vendor: string
  taskDescription?: string
}

export interface AgentVote {
  agentId: string
  decision: 'approve' | 'reject'
  reason: string
}

export interface EvaluationResult {
  decision: 'approve' | 'reject'
  votes: AgentVote[]
  policyDecision: 'approved' | 'rejected'
  escrowContractId?: string
  reason?: string
}

export interface RegisteredAgent {
  agentId: string
  type: 'shieldpay' | 'custom'
  endpoint?: string
  description?: string
  isActive: boolean
}

export interface ConsensusConfig {
  quorum: 'majority' | 'unanimous' | 'any'
  timeoutMs: number
  agents: string[]
}
