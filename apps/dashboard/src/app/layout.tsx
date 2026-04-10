import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { Providers } from './providers'
import { Sidebar } from '@/components/Sidebar'
import { Toaster } from '@/components/ui/sonner'

export const metadata: Metadata = {
  title: 'Sentinel Dashboard',
  description: 'AI agent payment governance — Sentinel + ShieldPay',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-background">
              {children}
            </main>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
