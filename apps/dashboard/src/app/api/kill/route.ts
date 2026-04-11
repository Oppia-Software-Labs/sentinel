import { NextResponse } from 'next/server'

export async function POST() {
  const url = process.env.SHIELDPAY_API_URL ?? 'http://localhost:4000'

  try {
    const res = await fetch(`${url}/api/mpp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'kill_all' }),
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
