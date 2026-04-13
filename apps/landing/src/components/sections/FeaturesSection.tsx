'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const features = [
  {
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
    title: 'Multi-agent Consensus',
    description:
      'Require M-of-N agent sign-off before any spend executes. Configure quorums per budget tier or risk level.',
  },
  {
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.955 11.955 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    title: 'Spend Policies',
    description:
      'Cap per-call, per-session, and daily spend. Policies are evaluated at intent time, not post-settlement.',
  },
  {
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
    title: 'Trustless Escrow',
    description:
      'Funds are held in Trustless Work escrow and released only on confirmed outcome, not on agent promise.',
  },
  {
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    title: 'x402 Facilitator',
    description:
      'OpenZeppelin + Stellar proxy handles HTTP 402 payment challenges natively inside any agent loop.',
  },
  {
    iconBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    title: 'Real-time Dashboard',
    description:
      'Watch every payment intent, policy evaluation, consensus vote, and escrow event as it happens.',
  },
  {
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0M10.5 8.25h3l-3 4.5h3" />
      </svg>
    ),
    title: 'Kill-switch & Alerts',
    description:
      'Pause any agent session instantly. Set spend thresholds that trigger automatic halts before damage accumulates.',
  },
]

export default function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>(new Array(features.length).fill(null))

  useGSAP(() => {
    // Header row: stagger children (left div, right p)
    if (headerRef.current) {
      gsap.from(Array.from(headerRef.current.children), {
        autoAlpha: 0,
        y: 24,
        stagger: 0.12,
        ease: 'power3.out',
        duration: 0.65,
        scrollTrigger: { trigger: headerRef.current, start: 'top 80%', once: true },
      })
    }

    // Feature cards: batch entrance with stagger
    const cards = cardRefs.current.filter(Boolean) as HTMLDivElement[]
    gsap.set(cards, { autoAlpha: 0, y: 40 })

    ScrollTrigger.batch(cards, {
      onEnter: (elements) => {
        gsap.to(elements, {
          autoAlpha: 1,
          y: 0,
          stagger: 0.08,
          ease: 'power3.out',
          duration: 0.7,
          overwrite: true,
        })
      },
      start: 'top 85%',
      once: true,
    })
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} id="features" className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">

        {/* Header row: label + headline left, subtext right */}
        <div ref={headerRef} className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <span className="inline-block rounded-full bg-lime-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-lime-700">
              Features
            </span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              Everything you need to govern agent spend
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-gray-400 sm:text-right">
            Sentinel and ShieldPay cover the full payment lifecycle, from intent to settlement, so
            nothing moves without your approval.
          </p>
        </div>

        {/* Card grid */}
        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              ref={(el) => { cardRefs.current[i] = el }}
              className="group relative flex flex-col rounded-2xl bg-gray-50 p-6 transition-shadow hover:shadow-md"
            >
              {/* Icon */}
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${feature.iconBg} ${feature.iconColor}`}>
                {feature.icon}
              </span>

              {/* Text */}
              <h3 className="mt-4 text-base font-bold text-gray-900">{feature.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-500">{feature.description}</p>

              {/* Arrow pill */}
              <div className="mt-5 flex justify-end">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-lime-200 text-lime-700 transition-colors group-hover:bg-lime-300">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
