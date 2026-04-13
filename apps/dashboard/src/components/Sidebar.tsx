'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Shield,
  Bot,
  Bell,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/policies', label: 'Policies', icon: Shield },
  { href: '/dashboard/agents', label: 'Agents', icon: Bot },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
]

const CONTRACT_SHORT = 'CBPWF5…UGDVF'

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-70 shrink-0 flex-col border-r border-emerald-900/10 bg-background">
      {/* Brand */}
      <div className="flex items-center gap-3.5 px-5 pb-6 pt-12">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-950">
          <Image
            src="/brand/sentinel-logo.png"
            alt="Sentinel"
            width={120}
            height={120}
            className="h-[22px] w-[22px] object-contain"
            priority
          />
        </div>
        <span className="text-lg font-semibold tracking-tight text-emerald-950">
          Sentinel
        </span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1 px-3 pt-8">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3.5 rounded-full px-4 py-3.5 text-base transition-colors',
                active
                  ? 'bg-emerald-950 font-semibold text-white shadow-sm'
                  : 'text-zinc-700 hover:bg-zinc-100/90 hover:text-zinc-950',
              )}
            >
              <Icon
                className={cn(
                  'h-5 w-5 shrink-0',
                  active ? 'text-white' : 'text-zinc-500',
                )}
                strokeWidth={1.85}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Connection card */}
      <div className="p-4 pt-2">
        <div className="rounded-2xl bg-emerald-50/90 p-5 shadow-[0_1px_0_rgba(6,78,59,0.06)] ring-1 ring-emerald-900/10 sm:p-6">
          <p className="text-base font-semibold leading-snug text-emerald-950 sm:text-lg">
            You&apos;re connected with:
          </p>
          <button
            type="button"
            className="mt-4 flex w-full items-center justify-between gap-3 rounded-full bg-emerald-950 px-5 py-4 text-left text-base font-medium text-emerald-50 transition-opacity hover:opacity-90"
          >
            <span className="mono truncate tracking-tight">{CONTRACT_SHORT}</span>
            <ChevronRight className="h-5 w-5 shrink-0 opacity-80" />
          </button>
          <p className="mt-4 text-xs text-emerald-800/60 sm:text-sm">Stellar Testnet</p>
        </div>
      </div>
    </aside>
  )
}
