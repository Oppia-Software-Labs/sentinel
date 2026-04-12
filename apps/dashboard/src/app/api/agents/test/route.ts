import { NextRequest, NextResponse } from 'next/server'

/**
 * Proxy to the ShieldPay API agent test endpoint.
 * Forwards the hosted agent config + sample intent for a live test run.
 */
export async function POST(req: NextRequest) {
  const shieldpayUrl = process.env.SHIELDPAY_API_URL ?? 'http://localhost:4000'

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const res = await fetch(`${shieldpayUrl}/api/agents/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
