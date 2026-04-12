import { NextRequest, NextResponse } from 'next/server'

const SHIELDPAY_URL = () => process.env.SHIELDPAY_API_URL ?? 'http://localhost:4000'
const OWNER_ID = () => process.env.NEXT_PUBLIC_OWNER_ID

/**
 * Proxy for agent registration / deletion.
 * The browser can't call ShieldPay (port 4000) directly due to CORS.
 * This route forwards the request and injects ownerId from the server env.
 */
export async function POST(req: NextRequest) {
  const ownerId = OWNER_ID()
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
    const res = await fetch(`${SHIELDPAY_URL()}/api/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

export async function DELETE(req: NextRequest) {
  const ownerId = OWNER_ID()
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
    const res = await fetch(`${SHIELDPAY_URL()}/api/agents`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
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
