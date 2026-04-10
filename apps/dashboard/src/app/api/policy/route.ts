import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { mirrorPolicy } from '@sentinel/sdk'

// 1 USDC = 10,000,000 units (Stellar asset precision = 7 decimal places)
const STROOPS_PER_USDC = 10_000_000

interface PolicyBody {
  max_per_task: number
  max_per_hour: number
  max_per_day: number
  alert_threshold: number
  blocked_vendors: string[]
}

export async function POST(req: NextRequest) {
  const ownerId = process.env.NEXT_PUBLIC_OWNER_ID
  if (!ownerId) {
    return NextResponse.json({ error: 'NEXT_PUBLIC_OWNER_ID not set' }, { status: 500 })
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  let body: PolicyBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Convert USDC → contract units (stroops) — same representation as the on-chain policy
  const rules = {
    max_per_task:    String(Math.round(body.max_per_task    * STROOPS_PER_USDC)),
    max_per_hour:    String(Math.round(body.max_per_hour    * STROOPS_PER_USDC)),
    max_per_day:     String(Math.round(body.max_per_day     * STROOPS_PER_USDC)),
    alert_threshold: String(Math.round(body.alert_threshold * STROOPS_PER_USDC)),
    blocked_vendors: body.blocked_vendors,
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  )

  try {
    await mirrorPolicy(supabase, ownerId, rules)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
