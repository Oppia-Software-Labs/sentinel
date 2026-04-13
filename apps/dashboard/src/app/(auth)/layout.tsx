import type { ReactNode } from 'react'
import Image from 'next/image'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 inset-0 bg-center bg-cover" style={{
      backgroundImage: "url('/hero/hero.svg')",
      filter: 'brightness(0.8)'}}>
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-950">
          <Image
            src="/brand/sentinel-logo.png"
            alt="Sentinel"
            width={80}
            height={80}
            className="h-5 w-5 object-contain"
            priority
          />
        </div>
        <span className="text-xl font-semibold tracking-tight text-emerald-950">Sentinel</span>
      </div>
      {children}
    </div>
  )
}
