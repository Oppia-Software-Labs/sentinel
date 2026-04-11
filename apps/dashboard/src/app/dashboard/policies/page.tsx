import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PolicyForm } from '@/components/PolicyForm'

export default async function PoliciesPage() {
  let rules: Record<string, unknown> | null = null

  try {
    const supabase = await createServerSupabaseClient()
    const ownerId = process.env.NEXT_PUBLIC_OWNER_ID

    if (ownerId) {
      const { data } = await supabase
        .from('policies')
        .select('rules')
        .eq('owner_id', ownerId)
        .maybeSingle()

      rules = (data?.rules as Record<string, unknown>) ?? null
    }
  } catch {
    // Supabase not configured — render empty form
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-base font-semibold tracking-tight">Policies</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Governance rules enforced on-chain by the Sentinel Soroban contract.
          All values in USDC — converted to stroops (×10⁷) on save.
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Form */}
      <PolicyForm initialRules={rules} />
    </div>
  )
}
