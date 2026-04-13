import { NextRequest, NextResponse } from 'next/server'
import { loadSorobanConfig, createSorobanClient, mirrorPolicy } from '@sentinel/sdk'
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

interface PolicyBody {
  max_per_task: number
  max_per_hour: number
  max_per_day: number
  alert_threshold: number
  blocked_vendors: string[]
}

const STROOPS_PER_USDC = 10_000_000

export async function POST(req: NextRequest) {
  const ownerId = await validateApiKey(req)
  if (!ownerId) return unauthorizedResponse()

  let body: PolicyBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    const soroban = loadSorobanConfig()
    const client = createSorobanClient(soroban)

    await client.setPolicy(ownerId, {
      maxPerTask:     Math.round(body.max_per_task     * STROOPS_PER_USDC),
      maxPerHour:     Math.round(body.max_per_hour     * STROOPS_PER_USDC),
      maxPerDay:      Math.round(body.max_per_day      * STROOPS_PER_USDC),
      blockedVendors: body.blocked_vendors,
      alertThreshold: Math.round(body.alert_threshold  * STROOPS_PER_USDC),
    })

    const supabase = createServiceRoleClient()
    await mirrorPolicy(supabase, ownerId, {
      max_per_task:    String(Math.round(body.max_per_task    * STROOPS_PER_USDC)),
      max_per_hour:    String(Math.round(body.max_per_hour    * STROOPS_PER_USDC)),
      max_per_day:     String(Math.round(body.max_per_day     * STROOPS_PER_USDC)),
      alert_threshold: String(Math.round(body.alert_threshold * STROOPS_PER_USDC)),
      blocked_vendors: body.blocked_vendors,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
