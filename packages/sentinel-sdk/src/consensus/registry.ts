import axios from 'axios'
import { z } from 'zod'
import type { SorobanClient } from '../soroban/client.js'
import type { RegisteredAgent, AgentVote, PaymentIntent } from '../types.js'

const AgentResponseSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  reason: z.string(),
})

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
  await sorobanClient.registerAgent(ownerId, agent.agentId, {
    agentType: agent.type,
    endpoint: agent.endpoint,
    description: agent.description,
    isActive: true,
  })
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
