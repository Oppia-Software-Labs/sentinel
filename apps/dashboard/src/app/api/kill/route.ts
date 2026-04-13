import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const service = createServiceRoleClient()
  const { data: profile } = await service
    .from('user_profiles')
    .select('owner_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const apiUrl = process.env.SHIELDPAY_API_URL ?? 'http://localhost:4000'
  const serviceKey = process.env.SENTINEL_SERVICE_KEY ?? ''

  try {
    const res = await fetch(`${apiUrl}/api/mpp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-sentinel-key': serviceKey,
        'x-sentinel-owner-id': profile.owner_id,
      },
      body: JSON.stringify({ action: 'kill_all' }),
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
