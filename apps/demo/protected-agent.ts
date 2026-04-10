/**
 * Protected agent — Fabián: import { evaluate } from '@sentinel/sdk' once Santiago implements it.
 */
import type { PaymentIntent } from '@sentinel/sdk'

const sample: PaymentIntent = {
  agentId: 'demo-agent-1',
  ownerId: '00000000-0000-0000-0000-000000000001',
  amount: 2.5,
  assetCode: 'USDC',
  vendor: 'openai-api',
}

console.info('protected-agent: stub', sample)
