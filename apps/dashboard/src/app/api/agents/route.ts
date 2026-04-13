import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

const SHIELDPAY_URL = () => process.env.SHIELDPAY_API_URL ?? 'http://localhost:4000'
const SERVICE_KEY = () => process.env.SENTINEL_SERVICE_KEY ?? ''

async function getOwnerId(): Promise<string | null> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const service = createServiceRoleClient()
    const { data } = await service
      .from('user_profiles')
      .select('owner_id')
      .eq('id', user.id)
      .single()

    return data?.owner_id ?? null
  } catch {
    return null
  }
}

/**
 * Proxy for agent registration / deletion.
 * The browser can't call ShieldPay (port 4000) directly due to CORS.
 * Injects ownerId from the authenticated session.
 */
export async function POST(req: NextRequest) {
  const ownerId = await getOwnerId()
  if (!ownerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
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
      headers: {
        'Content-Type': 'application/json',
        'x-sentinel-key': SERVICE_KEY(),
        'x-sentinel-owner-id': ownerId,
      },
      body: JSON.stringify({ ...body, ownerId }),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { error: 'ShieldPay API unreachable — is it running?' },
      { status: 502 },
    )
  }
}

export async function DELETE(req: NextRequest) {
  const ownerId = await getOwnerId()
  if (!ownerId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
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
      headers: {
        'Content-Type': 'application/json',
        'x-sentinel-key': SERVICE_KEY(),
        'x-sentinel-owner-id': ownerId,
      },
      body: JSON.stringify({ ...body, ownerId }),
    })

    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch {
    return NextResponse.json(
      { error: 'ShieldPay API unreachable — is it running?' },
      { status: 502 },
    )
  }
}
