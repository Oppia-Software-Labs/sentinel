/**
 * x402 Stellar client — uses the official @x402/fetch + @x402/stellar packages.
 *
 * The @x402/stellar ExactStellarScheme handles:
 *   - Probing the 402 response (payment-required header)
 *   - Building the Soroban SAC USDC transfer with a dummy source (so Soroban
 *     generates sorobanCredentialsAddress auth entries, not implicit source-account auth)
 *   - Signing auth entries only (not the full tx envelope) via authorizeEntry
 *   - Encoding the X-PAYMENT header and retrying
 *
 * Reference: https://github.com/coinbase/x402
 */

import * as StellarSdk from '@stellar/stellar-sdk'
import { wrapFetchWithPayment, x402Client } from '@x402/fetch'
import { createEd25519Signer } from '@x402/stellar'
import { ExactStellarScheme } from '@x402/stellar/exact/client'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface X402PaymentRequirements {
  scheme: string
  network: string
  amount: string
  asset: string
  payTo: string
  maxTimeoutSeconds: number
  extra?: { areFeesSponsored?: boolean; [k: string]: unknown }
}

export interface X402PaymentRequired {
  x402Version: number
  error: string
  resource: { url: string; description: string; mimeType: string }
  accepts: X402PaymentRequirements[]
}

export interface X402FetchResult {
  status: number
  data: unknown
  requirements?: X402PaymentRequirements
  stellarTxHash?: string
  paymentSent: boolean
}

// ── Detect 402 ────────────────────────────────────────────────────────────────

export async function detectX402(
  url: string,
  method = 'GET',
  body?: unknown,
): Promise<{ is402: boolean; requirements?: X402PaymentRequirements; x402Version?: number }> {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  if (res.status !== 402) {
    return { is402: false }
  }

  const reqHeader = res.headers.get('payment-required')
  if (!reqHeader) {
    return { is402: true }
  }

  try {
    const decoded = Buffer.from(reqHeader, 'base64').toString('utf8')
    const root: X402PaymentRequired = JSON.parse(decoded)
    const requirements = root.accepts?.find(a => a.scheme === 'exact' && a.network.startsWith('stellar'))
    return { is402: true, requirements, x402Version: root.x402Version }
  } catch {
    return { is402: true }
  }
}

// ── Full x402 fetch ───────────────────────────────────────────────────────────

export async function fetchWithX402(
  url: string,
  method = 'GET',
  body: unknown,
  payerKeypair: StellarSdk.Keypair,
  _server: StellarSdk.rpc.Server,
  networkPassphrase: string,
): Promise<X402FetchResult> {
  // Derive the CAIP-2 network string from the network passphrase
  const caip2Network = (
    networkPassphrase === StellarSdk.Networks.PUBLIC ? 'stellar:pubnet' : 'stellar:testnet'
  ) as `${string}:${string}`

  // createEd25519Signer wraps the secret key — signs auth entries, not tx envelopes
  const signer = createEd25519Signer(payerKeypair.secret(), caip2Network)

  // Build x402Client with ExactStellarScheme registered for this network
  const x402 = new x402Client().register(caip2Network, new ExactStellarScheme(signer))
  const fetchWithPay = wrapFetchWithPayment(fetch, x402)

  const init: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }

  const paid = await fetchWithPay(url, init)

  // Parse payment-response header (stellar.org uses `payment-response`, not `x-payment-response`)
  let stellarTxHash: string | undefined
  const paymentResponse = paid.headers.get('payment-response') ?? paid.headers.get('x-payment-response')
  if (paymentResponse) {
    try {
      const pr = JSON.parse(Buffer.from(paymentResponse, 'base64').toString('utf8'))
      stellarTxHash = pr.transaction ?? pr.txHash ?? pr.hash
    } catch { /* ignore */ }
  }

  // Try JSON first, fall back to text (some endpoints return HTML or plain text)
  const contentType = paid.headers.get('content-type') ?? ''
  let data: unknown
  if (contentType.includes('application/json')) {
    data = await paid.json().catch(() => null)
  } else {
    const text = await paid.text().catch(() => null)
    data = text ? { content: text.slice(0, 2000) } : null
  }

  // Probe to get requirements (for metadata returned to caller)
  const probe = await detectX402(url, method, body).catch(() => ({ is402: false as const }))
  const requirements = probe.is402 ? probe.requirements : undefined

  return {
    status: paid.status,
    data,
    requirements,
    stellarTxHash,
    paymentSent: paid.status !== 402,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Derive a vendor name from a URL */
export function vendorFromUrl(url: string): string {
  try {
    const { hostname, pathname } = new URL(url)
    const path = pathname.replace(/\//g, '-').replace(/^-|-$/g, '').slice(0, 20)
    const base = hostname.replace(/\./g, '-')
    return (path ? `${base}-${path}` : base).replace(/[^a-zA-Z0-9-]/g, '-').replace(/-+/g, '-')
  } catch {
    return 'unknown-vendor'
  }
}

/** Convert amount from token smallest unit (string) to USDC float */
export function tokenUnitsToUsdc(amount: string, decimals = 7): number {
  return Number(amount) / Math.pow(10, decimals)
}
