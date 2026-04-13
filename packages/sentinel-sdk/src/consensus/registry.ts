import axios from 'axios'
import { z } from 'zod'
import type { SorobanClient } from '../soroban/client.js'
import type { RegisteredAgent, AgentVote, PaymentIntent } from '../types.js'

const AgentResponseSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  reason: z.string(),
})

/** ContractError::AgentAlreadyExists = 4 — see contracts/sentinel-governance/src/errors.rs */
function isAgentAlreadyExistsError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  if (/AgentAlreadyExists/i.test(msg)) return true
  if (/Error\(Contract,\s*#?4\)/i.test(msg)) return true
  return false
}

export async function getAgents(
  ownerId: string,
  sorobanClient: SorobanClient,
): Promise<RegisteredAgent[]> {
  return sorobanClient.getAgents(ownerId)
}

export async function registerAgent(
  ownerId: string,
  agent: {
    agentId: string
    type: 'shieldpay' | 'custom'
    endpoint: string
    description: string
  },
  sorobanClient: SorobanClient,
): Promise<void> {
  const payload = {
    agentType: agent.type,
    endpoint: agent.endpoint,
    description: agent.description,
    isActive: true,
  }
  try {
    await sorobanClient.registerAgent(ownerId, agent.agentId, payload)
  } catch (err) {
    if (!isAgentAlreadyExistsError(err)) throw err
    await sorobanClient.removeAgent(ownerId, agent.agentId)
    await sorobanClient.registerAgent(ownerId, agent.agentId, payload)
  }
}

export async function callAgent(
  endpoint: string,
  intent: PaymentIntent,
  context: { totalSpentToday: number; totalSpentHour: number },
  timeoutMs: number = 5000,
): Promise<AgentVote> {
  try {
    const response = await axios.post(
      endpoint,
      { intent, context },
      { timeout: timeoutMs },
    )

    const parsed = AgentResponseSchema.parse(response.data)
    return {
      agentId: '',
      decision: parsed.decision,
      reason: parsed.reason,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return {
      agentId: '',
      decision: 'reject',
      reason: `agent call failed: ${message}`,
    }
  }
}
