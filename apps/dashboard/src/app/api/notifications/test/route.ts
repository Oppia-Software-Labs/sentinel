import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

const SHIELDPAY_API_URL = process.env.SHIELDPAY_API_URL ?? 'http://localhost:4000'

export async function POST(req: NextRequest) {
  try {
    const { configId } = await req.json()
    if (!configId) return NextResponse.json({ error: 'Missing configId' }, { status: 400 })

    const supabase = createServiceRoleClient()
    const { data: cfg, error } = await supabase
      .from('notification_configs')
      .select('*')
      .eq('id', configId)
      .single()

    if (error || !cfg) return NextResponse.json({ error: 'Config not found' }, { status: 404 })

    // Ask shieldpay-api to dispatch a test notification using the existing dispatch lib
    const res = await fetch(`${SHIELDPAY_API_URL}/api/notifications/dispatch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'transaction_settled',
        payload: {
          test: true,
          vendor: 'test-vendor',
          amount: 1.00,
          message: 'This is a test notification from Sentinel.',
        },
        configId,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return NextResponse.json({ error: `Dispatch failed: ${text}` }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
