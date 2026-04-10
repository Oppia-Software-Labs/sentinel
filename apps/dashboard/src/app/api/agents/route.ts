import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy for agent registration.
 * The browser can't call ShieldPay (port 4000) directly due to CORS.
 * This route forwards the request and injects ownerId from the server env.
 *
 * NOTE: Never write directly to Supabase for agents — ShieldPay handles both
 * Soroban (source of truth) + Supabase mirror in a single call.
 */
export async function POST(req: NextRequest) {
  const ownerId = process.env.NEXT_PUBLIC_OWNER_ID
  const shieldpayUrl = process.env.SHIELDPAY_API_URL ?? 'http://localhost:4000'

  if (!ownerId) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_OWNER_ID not set' }, { status: 500 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const res = await fetch(`${shieldpayUrl}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Inject ownerId server-side — client doesn't need to send it
      body: JSON.stringify({ ...body, ownerId }),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { error: 'ShieldPay API unreachable — is it running on port 4000?' },
      { status: 502 },
    )
  }
}
