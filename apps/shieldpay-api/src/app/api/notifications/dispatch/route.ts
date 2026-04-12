import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '../../../../lib/supabase/server'
import { dispatchNotifications, type NotificationEvent } from '../../../../lib/notifications/dispatch'

export async function POST(req: NextRequest) {
  try {
    const { event, payload, configId } = await req.json()
    if (!event) return NextResponse.json({ error: 'Missing event' }, { status: 400 })

    let supabase: ReturnType<typeof createServiceRoleClient>
    try {
      supabase = createServiceRoleClient()
    } catch {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })
    }

    if (configId) {
      // Temporarily enable the config for the test dispatch, then restore
      await supabase
        .from('notification_configs')
        .update({ enabled: true })
        .eq('id', configId)

      await dispatchNotifications(supabase, event as NotificationEvent, payload ?? {})

      // Re-fetch to restore original enabled state
      const { data: orig } = await supabase
        .from('notification_configs')
        .select('enabled')
        .eq('id', configId)
        .single()

      if (orig != null && !(orig as { enabled?: boolean }).enabled) {
        await supabase
          .from('notification_configs')
          .update({ enabled: false })
          .eq('id', configId)
      }

      return NextResponse.json({ ok: true })
    }

    await dispatchNotifications(supabase, event as NotificationEvent, payload ?? {})
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
