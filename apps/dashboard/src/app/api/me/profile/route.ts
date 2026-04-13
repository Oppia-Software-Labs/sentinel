import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { ownerId: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { ownerId } = body
  if (!ownerId || !ownerId.startsWith('G')) {
    return NextResponse.json({ error: 'Invalid ownerId — must be a Stellar public key' }, { status: 400 })
  }

  const service = createServiceRoleClient()

  // Idempotent — if profile already exists return it
  const { data: existing } = await service
    .from('user_profiles')
    .select('owner_id')
    .eq('id', user.id)
    .single()

  if (existing) {
    return NextResponse.json({ ownerId: existing.owner_id })
  }

  const { error } = await service.from('user_profiles').insert({ id: user.id, owner_id: ownerId })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Synchronously trigger account setup in shieldpay-api.
  // This registers the 3 default agents on Soroban, sets consensus, and funds 100 USDC.
  // ~20–30s — the onboarding page shows a progress screen while waiting.
  const apiUrl     = process.env.SHIELDPAY_API_URL ?? 'http://localhost:4000'
  const serviceKey = process.env.SENTINEL_SERVICE_KEY ?? ''
  let setupErrors: string[] | undefined

  if (serviceKey) {
    try {
      const setupRes = await fetch(`${apiUrl}/api/me/setup-account`, {
        method:  'POST',
        headers: {
          'Content-Type':        'application/json',
          'x-sentinel-key':      serviceKey,
          'x-sentinel-owner-id': ownerId,
        },
        signal: AbortSignal.timeout(60_000), // 60s max
      })
      const setupData = await setupRes.json().catch(() => ({}))
      if (setupData.errors) setupErrors = setupData.errors
    } catch (err) {
      console.warn('[profile] setup-account failed:', err)
    }
  }

  return NextResponse.json({ ownerId, ...(setupErrors ? { setupErrors } : {}) })
}
