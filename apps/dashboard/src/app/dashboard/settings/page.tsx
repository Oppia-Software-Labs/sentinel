import { redirect } from 'next/navigation'
import { SettingsClient } from './SettingsClient'
import { getSessionUser } from '@/lib/supabase/session'

export default async function SettingsPage() {
  const session = await getSessionUser()
  if (!session) redirect('/login')

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
        <h2 className="text-2xl font-bold tracking-tight text-white">Settings</h2>
        <p className="mt-1 text-sm text-white/70">Manage Agent Identity and API Keys.</p>
      </div>
    </div>

    <SettingsClient ownerId={session.ownerId} />
  </div>)
}
