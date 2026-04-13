import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, unauthorizedResponse } from '../../../../lib/auth/api-key'
import { createServiceRoleClient } from '../../../../lib/supabase/server'

export async function GET(req: NextRequest) {
  const ownerId = await validateApiKey(req)
  if (!ownerId) return unauthorizedResponse()

  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('policies')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return NextResponse.json({ policy: null }, { status: 200 })
    }

    return NextResponse.json({ policy: data })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
