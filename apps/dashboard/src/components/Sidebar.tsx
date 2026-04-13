'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Shield,
  Bot,
  Bell,
  Settings,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/policies', label: 'Policies', icon: Shield },
  { href: '/dashboard/agents', label: 'Agents', icon: Bot },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

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

      {/* Logout */}
      <div className="px-3 pb-6">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3.5 rounded-full px-4 py-3.5 text-base text-zinc-500 transition-colors hover:bg-zinc-100/90 hover:text-zinc-950"
        >
          <LogOut className="h-5 w-5 shrink-0" strokeWidth={1.85} />
          Log out
        </button>
      </div>
    </aside>
  )
}
