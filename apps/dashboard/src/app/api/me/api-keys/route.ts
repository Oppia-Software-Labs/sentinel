import { NextRequest, NextResponse } from 'next/server'
import { createHash, randomBytes } from 'crypto'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceRoleClient()
  const { data: profile } = await service
    .from('user_profiles')
    .select('owner_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { data: keys } = await service
    .from('api_keys')
    .select('id, prefix, label, created_at')
    .eq('owner_id', profile.owner_id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ keys: keys ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceRoleClient()
  const { data: profile } = await service
    .from('user_profiles')
    .select('owner_id')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Profile not found — complete onboarding first' }, { status: 404 })

  let label = 'API key'
  try {
    const body = await req.json()
    if (body.label) label = String(body.label).slice(0, 64)
  } catch { /* label stays default */ }

  // Generate raw key: sk_live_ + 32 random bytes as hex
  const rawKey = `sk_live_${randomBytes(32).toString('hex')}`
  const hash = createHash('sha256').update(rawKey).digest('hex')
  const prefix = rawKey.slice(0, 15)  // "sk_live_" + first 7 hex chars

  const { error } = await service.from('api_keys').insert({
    owner_id: profile.owner_id,
    key_hash: hash,
    prefix,
    label,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Return raw key once — never stored in plaintext
  return NextResponse.json({ key: rawKey, prefix, label })
}
