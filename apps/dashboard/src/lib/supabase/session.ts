import { createServerSupabaseClient, createServiceRoleClient } from './server'

/**
 * Returns the authenticated Supabase user and their Stellar owner_id.
 * Returns null for both if not logged in or not yet onboarded.
 */
export async function getSessionUser(): Promise<{
  userId: string
  ownerId: string
} | null> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const service = createServiceRoleClient()
    const { data } = await service
      .from('user_profiles')
      .select('owner_id')
      .eq('id', user.id)
      .single()

    if (!data?.owner_id) return null

    return { userId: user.id, ownerId: data.owner_id }
  } catch {
    return null
  }
}
