import type { SorobanClient } from '../soroban/client.js'
import type { PaymentIntent, PolicyResult } from '../types.js'

export async function evaluatePolicy(
  intent: PaymentIntent,
  ownerId: string,
  sorobanClient: SorobanClient,
): Promise<PolicyResult> {
  return sorobanClient.verifyPolicy(ownerId, intent.amount, intent.vendor)
}
