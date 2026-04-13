'use client'

import { useEffect, useState } from 'react'

const NAV_LINKS = [
  { label: 'Problem', href: '#problem' },
  { label: 'Solution', href: '#governance' },
  { label: 'Features', href: '#features' },
]

export default function Navbar() {
  const [active, setActive] = useState<string>('#problem')

  useEffect(() => {
    const sections = NAV_LINKS.map((l) => l.href.slice(1))
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting)
        if (visible) setActive(`#${visible.target.id}`)
      },
      { rootMargin: '-40% 0px -50% 0px' },
    )
    sections.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <header className="fixed left-1/2 top-5 z-50 -translate-x-1/2 drop-shadow-[0_2px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-center gap-8 rounded-full bg-white px-6 py-3 shadow-sm ring-1 ring-zinc-200/80">
        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map(({ label, href }) => (
            <a
              key={href}
              href={href}
              className={
                active === href
                  ? 'text-sm font-semibold text-zinc-900 transition-colors'
                  : 'text-sm font-normal text-zinc-500 transition-colors hover:text-[#166534]'
              }
            >
              {label}
            </a>
          ))}
        </nav>

        <a
          href="#"
          className="rounded-full bg-[#14532d] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#166534]"
        >
          Launch App
        </a>
      </div>
    </header>
  )
}
