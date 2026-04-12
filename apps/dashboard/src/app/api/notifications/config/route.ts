import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

const OWNER_ID = process.env.OWNER_ID ?? 'default'

// Mask the api_key field so it is never returned to the client
function maskConfig(cfg: Record<string, string>): Record<string, string> {
  if (!cfg.api_key) return cfg
  return { ...cfg, api_key: '••••••••' }
}

export async function GET() {
  try {
    const supabase = await createServiceRoleClient()
    const { data, error } = await supabase
      .from('notification_configs')
      .select('*')
      .eq('owner_id', OWNER_ID)
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const safe = (data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      config: maskConfig(row.config as Record<string, string>),
    }))

    return NextResponse.json(safe)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, type, config, enabled, events } = body

    if (!type || !config) {
      return NextResponse.json({ error: 'Missing type or config' }, { status: 400 })
    }

    const supabase = await createServiceRoleClient()

    if (id) {
      // Update existing — only overwrite api_key if a real value is provided
      const { data: existing } = await supabase
        .from('notification_configs')
        .select('config')
        .eq('id', id)
        .single()

      const mergedConfig = { ...(existing?.config ?? {}), ...config }
      // If the client sent the masked placeholder back, restore the real key
      if (mergedConfig.api_key === '••••••••') {
        mergedConfig.api_key = (existing?.config as Record<string, string>)?.api_key ?? ''
      }

      const { error } = await supabase
        .from('notification_configs')
        .update({ type, config: mergedConfig, enabled, events, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('owner_id', OWNER_ID)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await supabase.from('notification_configs').insert({
        owner_id: OWNER_ID,
        type,
        config,
        enabled: enabled ?? true,
        events: events ?? ['transaction_blocked', 'transaction_settled', 'kill_switch_triggered'],
      })

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const supabase = await createServiceRoleClient()
    const { error } = await supabase
      .from('notification_configs')
      .delete()
      .eq('id', id)
      .eq('owner_id', OWNER_ID)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
