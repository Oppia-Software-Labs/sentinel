'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Shield, Bot, Bell, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard',               label: 'Overview',      icon: LayoutDashboard },
  { href: '/dashboard/policies',      label: 'Policies',      icon: Shield },
  { href: '/dashboard/agents',        label: 'Agents',        icon: Bot },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-card">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
        <ShieldCheck className="h-5 w-5 text-blue-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold leading-none text-foreground">Sentinel</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">ShieldPay Dashboard</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-0.5 p-3 flex-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-accent text-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground">
          Contract{' '}
          <span className="mono text-blue-400/70">
            CBPWF5…UGDVF
          </span>
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Stellar Testnet</p>
      </div>
    </aside>
  )
}
