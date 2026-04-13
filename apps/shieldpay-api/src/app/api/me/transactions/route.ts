import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, unauthorizedResponse } from '../../../../lib/auth/api-key'
import { createServiceRoleClient } from '../../../../lib/supabase/server'

export async function GET(req: NextRequest) {
  const ownerId = await validateApiKey(req)
  if (!ownerId) return unauthorizedResponse()

  const limitParam = req.nextUrl.searchParams.get('limit')
  const limit = Math.min(Math.max(parseInt(limitParam ?? '10', 10) || 10, 1), 50)

  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ transactions: data ?? [] })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
