'use client'

import { useRef, useEffect } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger, useGSAP)

// Arrow pill shown on card hover
function ArrowPill() {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-lime-200 text-lime-700 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
      </svg>
    </span>
  )
}

// Mini voting UI for the large card
function VotingMockup() {
  const agents = [
    { name: 'agent_alpha', color: 'bg-violet-500', initial: 'A' },
    { name: 'agent_beta', color: 'bg-blue-500', initial: 'B' },
    { name: 'agent_gamma', color: 'bg-emerald-500', initial: 'G' },
  ]
  return (
    <div className="mt-5 rounded-xl bg-gray-50 p-4">
      <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-widest text-gray-400">
        consensus.vote()
      </p>
      {agents.map((a, i) => (
        <div key={i} className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white ${a.color}`}
            >
              {a.initial}
            </div>
            <span className="font-mono text-[11px] text-gray-500">{a.name}</span>
          </div>
          <span className="rounded-full bg-green-100 px-2 py-0.5 font-mono text-[10px] font-semibold text-green-700">
            ✓ approved
          </span>
        </div>
      ))}
      <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-center font-mono text-[10px] font-semibold text-green-700">
        3/3 quorum — payment authorized
      </div>
    </div>
  )
}

export default function FeaturesBento() {
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>(new Array(6).fill(null))

  // Scroll-driven stagger entrance via useGSAP (auto-cleanup on unmount)
  useGSAP(() => {
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[]

    // Set initial invisible state
    gsap.set(cards, { autoAlpha: 0, y: 50 })

    // Batch: animate any card entering the viewport
    ScrollTrigger.batch(cards, {
      onEnter: (elements) => {
        gsap.to(elements, {
          autoAlpha: 1,
          y: 0,
          stagger: 0.07,
          ease: 'power3.out',
          duration: 0.75,
          overwrite: true,
        })
      },
      start: 'top 80%',
      once: true,
    })
  }, { scope: containerRef })

  // Magnetic hover — registered in useEffect, cleaned up manually
  useEffect(() => {
    const cleanups: (() => void)[] = []

    cardRefs.current.filter(Boolean).forEach((card) => {
      if (!card) return

      const onMove = (e: MouseEvent) => {
        const rect = card.getBoundingClientRect()
        const cx = rect.left + rect.width / 2
        const cy = rect.top + rect.height / 2
        const x = Math.max(-12, Math.min(12, (e.clientX - cx) * 0.11))
        const y = Math.max(-12, Math.min(12, (e.clientY - cy) * 0.11))
        gsap.to(card, { x, y, duration: 0.3, ease: 'power2.out', overwrite: 'auto' })
      }

      const onLeave = () => {
        gsap.to(card, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.5)', overwrite: 'auto' })
      }

      card.addEventListener('mousemove', onMove)
      card.addEventListener('mouseleave', onLeave)
      cleanups.push(() => {
        card.removeEventListener('mousemove', onMove)
        card.removeEventListener('mouseleave', onLeave)
      })
    })

    return () => cleanups.forEach((fn) => fn())
  }, [])

  // Shared card class — border only, no shadow, no fill
  const card = 'group relative flex flex-col rounded-[16px] border border-gray-200 bg-white'

  return (
    <section id="features" className="bg-white py-24 sm:py-32">
      <div ref={containerRef} className="mx-auto max-w-7xl px-6 lg:px-10">

        {/* Section header — label left, subtext right */}
        <div className="mb-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-lg">
            <span className="inline-block rounded-full bg-lime-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-lime-700">
              Features
            </span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Everything you need to govern agent spend
            </h2>
          </div>
          <p className="max-w-xs text-sm leading-relaxed text-gray-400 sm:text-right">
            Sentinel and ShieldPay cover the full payment lifecycle so nothing moves without your approval.
          </p>
        </div>

        {/* Bento grid — asymmetric 3-column layout */}
        <div
          className="grid grid-cols-3 gap-4"
          style={{ gridTemplateRows: '240px 240px 160px' }}
        >

          {/* ① Large — Multi-agent Consensus (col-span-2, row-span-2) */}
          <div
            ref={(el) => { cardRefs.current[0] = el }}
            className={`${card} col-span-2 row-span-2 p-7`}
          >
            <div className="flex items-start justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                </svg>
              </span>
              <ArrowPill />
            </div>
            <h3 className="mt-4 text-xl font-bold text-gray-900">Multi-agent Consensus</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Require M-of-N agent sign-off before any spend executes. Configure quorums per budget
              tier or risk level — 2-of-3 for low-risk, 4-of-5 for large transfers.
            </p>
            <VotingMockup />
          </div>

          {/* ② Medium — Spend Policies */}
          <div
            ref={(el) => { cardRefs.current[1] = el }}
            className={`${card} p-6`}
          >
            <div className="flex items-start justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50 text-purple-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.955 11.955 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </span>
              <ArrowPill />
            </div>
            <h3 className="mt-4 text-base font-bold text-gray-900">Spend Policies</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Cap per-call, per-session, and daily spend. Policies evaluated at intent time — not post-settlement.
            </p>
          </div>

          {/* ③ Medium — Trustless Escrow */}
          <div
            ref={(el) => { cardRefs.current[2] = el }}
            className={`${card} p-6`}
          >
            <div className="flex items-start justify-between">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              </span>
              <ArrowPill />
            </div>
            <h3 className="mt-4 text-base font-bold text-gray-900">Trustless Escrow</h3>
            <p className="mt-2 text-sm leading-relaxed text-gray-500">
              Funds held in Trustless Work escrow and released only on confirmed outcome — not on agent promise.
            </p>
          </div>

          {/* ④ Small — x402 Facilitator */}
          <div
            ref={(el) => { cardRefs.current[3] = el }}
            className={`${card} p-5`}
          >
            <div className="flex items-start justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </span>
              <ArrowPill />
            </div>
            <h3 className="mt-3 text-sm font-bold text-gray-900">x402 Facilitator</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
              OpenZeppelin + Stellar proxy handles HTTP 402 challenges inside any agent loop.
            </p>
          </div>

          {/* ⑤ Small — Real-time Dashboard */}
          <div
            ref={(el) => { cardRefs.current[4] = el }}
            className={`${card} p-5`}
          >
            <div className="flex items-start justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
              </span>
              <ArrowPill />
            </div>
            <h3 className="mt-3 text-sm font-bold text-gray-900">Real-time Dashboard</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
              Every payment intent, policy evaluation, and escrow event live as it happens.
            </p>
          </div>

          {/* ⑥ Small — Kill-switch & Alerts */}
          <div
            ref={(el) => { cardRefs.current[5] = el }}
            className={`${card} p-5`}
          >
            <div className="flex items-start justify-between">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M10.5 8.25h3l-3 4.5h3" />
                </svg>
              </span>
              <ArrowPill />
            </div>
            <h3 className="mt-3 text-sm font-bold text-gray-900">Kill-switch & Alerts</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
              Pause any agent session instantly. Automatic halts on spend threshold breach.
            </p>
          </div>

        </div>
      </div>
    </section>
  )
}
