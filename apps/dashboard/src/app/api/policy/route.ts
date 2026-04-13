import { NextRequest, NextResponse } from 'next/server'

interface PolicyBody {
  max_per_task: number
  max_per_hour: number
  max_per_day: number
  alert_threshold: number
  blocked_vendors: string[]
}

export async function POST(req: NextRequest) {
  const apiUrl     = process.env.SHIELDPAY_API_URL ?? 'http://localhost:4000'
  const serviceKey = process.env.SENTINEL_SERVICE_KEY ?? ''
  const ownerId    = process.env.NEXT_PUBLIC_OWNER_ID ?? ''

  if (!serviceKey || !ownerId) {
    return NextResponse.json({ error: 'SENTINEL_SERVICE_KEY or NEXT_PUBLIC_OWNER_ID not set' }, { status: 500 })
  }

  let body: PolicyBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const res = await fetch(`${apiUrl}/api/me/policy`, {
      method:  'POST',
      headers: {
        'Content-Type':        'application/json',
        'x-sentinel-key':      serviceKey,
        'x-sentinel-owner-id': ownerId,
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return NextResponse.json(
        { error: data.error ?? `shieldpay-api responded ${res.status}` },
        { status: res.status },
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
