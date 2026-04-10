/**
 * Trustless Work escrow — lives only in ShieldPay API (not in @sentinel/sdk).
 * Wire to TW HTTP API using env from apps/shieldpay-api/.env.local.
 */

export async function fundEscrow(_amount: number, _vendor: string): Promise<string> {
  throw new Error('fundEscrow not implemented')
}

export async function releaseEscrow(_contractId: string): Promise<void> {
  throw new Error('releaseEscrow not implemented')
}

export async function refundEscrow(_contractId: string): Promise<void> {
  throw new Error('refundEscrow not implemented')
}
