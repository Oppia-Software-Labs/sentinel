import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '../supabase/server'

/**
 * Validates the X-Sentinel-Key header and returns the associated owner_id.
 *
 * Two modes:
 *  - Normal API key: sha256 hash looked up in `api_keys` table → returns owner_id
 *  - Service key (SENTINEL_SERVICE_KEY): trusted internal caller (e.g. dashboard).
 *    Returns the value of the X-Sentinel-Owner-Id header so the caller can specify
 *    any owner_id without a per-user key.
 *
 * Returns null if the key is missing, invalid, or the owner lookup fails.
 */
export async function validateApiKey(req: NextRequest): Promise<string | null> {
  const key = req.headers.get('x-sentinel-key')
  if (!key) return null

  // Service key — trusted internal caller (dashboard proxy routes)
  const serviceKey = process.env.SENTINEL_SERVICE_KEY
  if (serviceKey && key === serviceKey) {
    return req.headers.get('x-sentinel-owner-id') ?? null
  }

  // Normal user API key: look up by hash
  const hash = createHash('sha256').update(key).digest('hex')

  try {
    const supabase = createServiceRoleClient()
    const { data } = await supabase
      .from('api_keys')
      .select('owner_id')
      .eq('key_hash', hash)
      .single()

    return data?.owner_id ?? null
  } catch {
    return null
  }
}

/** Returns a 401 Response if the key is missing/invalid. */
export function unauthorizedResponse(): Response {
  return new Response(
    JSON.stringify({ error: 'Missing or invalid X-Sentinel-Key header' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } },
  )
}
