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
    <div className="space-y-6 p-6">
      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl" style={{ height: '200px' }}>
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/hero/hero.svg')",
            filter: 'brightness(0.8)',
          }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 65%)', zIndex: 0 }} />
        <div className="relative z-10 flex h-full flex-col justify-center px-8">
          <span className="mb-2 inline-flex w-fit items-center rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/80">
            Sentinel
          </span>
          <h2 className="text-2xl font-bold tracking-tight text-white">Policies</h2>
          <p className="mt-1 text-sm text-white/70">Governance rules enforced on-chain by the Sentinel Soroban contract</p>
        </div>
      </div>

      <PolicyForm initialRules={rules} />
    </div>
  )
}
