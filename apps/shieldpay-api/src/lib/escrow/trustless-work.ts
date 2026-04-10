/**
 * Trustless Work escrow — lives only in ShieldPay API (not in @sentinel/sdk).
 * Wire to TW HTTP API using env from apps/shieldpay-api/.env.local.
 *
 * Full escrow lifecycle:
 *   fundEscrow    → deploy contract + fund it → returns contractId
 *   releaseEscrow → complete milestone + approve + release funds
 *   refundEscrow  → open dispute + resolve dispute (full refund to depositor)
 */

import axios from 'axios'
import { Keypair, TransactionBuilder } from '@stellar/stellar-sdk'

function getTwConfig() {
  const baseURL = process.env.TRUSTLESS_WORK_API_URL ?? 'https://dev.api.trustlesswork.com'
  const apiKey = process.env.TRUSTLESS_WORK_API_KEY ?? ''
  const signerSecret = process.env.TRUSTLESS_WORK_RELEASE_SIGNER ?? ''
  const networkPassphrase =
    process.env.STELLAR_NETWORK_PASSPHRASE ?? 'Test SDF Network ; September 2015'
  const usdcIssuer =
    process.env.USDC_ISSUER_ADDRESS ?? 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'

  if (!signerSecret) throw new Error('Missing TRUSTLESS_WORK_RELEASE_SIGNER')

  const keypair = Keypair.fromSecret(signerSecret)
  const signerAddress = keypair.publicKey()

  const http = axios.create({
    baseURL,
    timeout: 30_000,
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
  })

  return { http, keypair, signerAddress, networkPassphrase, usdcIssuer }
}

async function signAndSend(
  http: ReturnType<typeof axios.create>,
  unsignedXdr: string,
  keypair: Keypair,
  networkPassphrase: string,
): Promise<unknown> {
  const tx = TransactionBuilder.fromXDR(unsignedXdr, networkPassphrase)
  tx.sign(keypair)
  const signedXdr = tx.toEnvelope().toXDR('base64')
  const { data } = await http.post('/helper/send-transaction', { signedXdr })
  return data
}

// In-process cache so refundEscrow knows the amount without an extra GET call
const escrowAmountCache = new Map<string, number>()

export async function fundEscrow(amount: number, vendor: string): Promise<string> {
  const { http, keypair, signerAddress, networkPassphrase, usdcIssuer } = getTwConfig()

  // Step 1: Deploy single-release escrow contract
  const deployRes = await http.post<{ unsignedTransaction: string }>('/deployer/single-release', {
    signer: signerAddress,
    engagementId: `shieldpay-${Date.now()}`,
    title: `ShieldPay → ${vendor}`,
    description: `AI agent payment escrow for vendor: ${vendor}`,
    roles: [
      { role: 'approver', address: signerAddress },
      { role: 'serviceProvider', address: signerAddress },
      { role: 'disputeResolver', address: signerAddress },
      { role: 'receiver', address: signerAddress },
      { role: 'platformAddress', address: signerAddress },
      { role: 'depositor', address: signerAddress },
    ],
    amount,
    platformFee: 0,
    milestones: [{ description: `Payment to ${vendor}`, amount }],
    trustline: [{ address: usdcIssuer, decimals: 10_000_000 }],
  })

  const deployData = (await signAndSend(
    http,
    deployRes.data.unsignedTransaction,
    keypair,
    networkPassphrase,
  )) as { contractId: string }

  const contractId = deployData.contractId

  // Step 2: Fund the deployed contract
  const fundRes = await http.post<{ unsignedTransaction: string }>(
    '/escrow/single-release/fund-escrow',
    { contractId, signer: signerAddress, amount },
  )
  await signAndSend(http, fundRes.data.unsignedTransaction, keypair, networkPassphrase)

  escrowAmountCache.set(contractId, amount)
  return contractId
}

export async function releaseEscrow(contractId: string): Promise<void> {
  const { http, keypair, signerAddress, networkPassphrase } = getTwConfig()

  // Step 1: Service provider marks milestone complete
  const statusRes = await http.post<{ unsignedTransaction: string }>(
    '/escrow/single-release/change-milestone-status',
    {
      contractId,
      milestoneIndex: '0',
      newStatus: 'completed',
      newEvidence: 'Payment delivered by ShieldPay',
      serviceProvider: signerAddress,
    },
  )
  await signAndSend(http, statusRes.data.unsignedTransaction, keypair, networkPassphrase)

  // Step 2: Approver approves milestone
  const approveRes = await http.post<{ unsignedTransaction: string }>(
    '/escrow/single-release/approve-milestone',
    { contractId, milestoneIndex: '0', approver: signerAddress },
  )
  await signAndSend(http, approveRes.data.unsignedTransaction, keypair, networkPassphrase)

  // Step 3: Release signer releases funds
  const releaseRes = await http.post<{ unsignedTransaction: string }>(
    '/escrow/single-release/release-funds',
    { contractId, releaseSigner: signerAddress },
  )
  await signAndSend(http, releaseRes.data.unsignedTransaction, keypair, networkPassphrase)

  escrowAmountCache.delete(contractId)
}

export async function refundEscrow(contractId: string): Promise<void> {
  const { http, keypair, signerAddress, networkPassphrase } = getTwConfig()
  const amount = escrowAmountCache.get(contractId)

  // Step 1: Open dispute (required before resolving)
  const disputeRes = await http.post<{ unsignedTransaction: string }>(
    '/escrow/single-release/dispute-escrow',
    { contractId, signer: signerAddress },
  )
  await signAndSend(http, disputeRes.data.unsignedTransaction, keypair, networkPassphrase)

  // Step 2: Resolve dispute — full amount back to depositor (operator)
  const distributions = [[signerAddress, amount ?? 0]]
  const resolveRes = await http.post<{ unsignedTransaction: string }>(
    '/escrow/single-release/resolve-dispute',
    { contractId, disputeResolver: signerAddress, distributions },
  )
  await signAndSend(http, resolveRes.data.unsignedTransaction, keypair, networkPassphrase)

  escrowAmountCache.delete(contractId)
}
