'use client'

import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger, useGSAP)

const features = [
  {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.955 11.955 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
    title: 'Policy enforced',
    desc: 'Every payment checked before settlement',
  },
  {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
      </svg>
    ),
    title: 'Real-time alerts',
    desc: 'Notified before money moves',
  },
  {
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
      </svg>
    ),
    title: 'Kill-switch',
    desc: 'Freeze any session instantly',
  },
]

export default function ProblemSolution() {
  const sectionRef = useRef<HTMLElement>(null)
  const stat1Ref = useRef<HTMLParagraphElement>(null)
  const stat2Ref = useRef<HTMLParagraphElement>(null)
  const label1Ref = useRef<HTMLParagraphElement>(null)
  const label2Ref = useRef<HTMLParagraphElement>(null)
  const rightContainerRef = useRef<HTMLDivElement>(null)
  const svgPath1 = useRef<SVGPathElement>(null)
  const svgPath2 = useRef<SVGPathElement>(null)
  const svgPath3 = useRef<SVGPathElement>(null)
  const svgNode1 = useRef<SVGGElement>(null)
  const svgNode2 = useRef<SVGGElement>(null)
  const svgNode3 = useRef<SVGGElement>(null)
  const svgNode4 = useRef<SVGGElement>(null)

  useGSAP(() => {
    // --- Stat counter roll-up: $47,000 ---
    const c1 = { val: 0 }
    gsap.to(c1, {
      val: 47000,
      duration: 2,
      ease: 'power2.out',
      onUpdate() {
        if (stat1Ref.current) {
          stat1Ref.current.textContent = '$' + Math.round(c1.val).toLocaleString()
        }
      },
      scrollTrigger: { trigger: stat1Ref.current, start: 'top 80%', once: true },
    })

    // --- Stat counter roll-up: 8,400x ---
    const c2 = { val: 0 }
    gsap.to(c2, {
      val: 8400,
      duration: 2,
      ease: 'power2.out',
      onUpdate() {
        if (stat2Ref.current) {
          stat2Ref.current.textContent = Math.round(c2.val).toLocaleString() + 'x'
        }
      },
      scrollTrigger: { trigger: stat2Ref.current, start: 'top 80%', once: true },
    })

    // --- Split text reveal on labels ---
    ;([label1Ref, label2Ref] as const).forEach((ref) => {
      if (!ref.current) return
      gsap.from(ref.current.querySelectorAll('span'), {
        y: 20,
        autoAlpha: 0,
        stagger: 0.025,
        ease: 'power2.out',
        duration: 0.45,
        scrollTrigger: { trigger: ref.current, start: 'top 80%', once: true },
      })
    })

    // --- Parallax: right container moves up at 0.3x scroll speed ---
    gsap.to(rightContainerRef.current, {
      yPercent: -6,
      ease: 'none',
      scrollTrigger: {
        trigger: sectionRef.current,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    })

    // --- SVG flow diagram draw-in ---
    const paths = [svgPath1, svgPath2, svgPath3]
      .map((r) => r.current)
      .filter(Boolean) as SVGPathElement[]

    const nodeGroups = [svgNode1, svgNode2, svgNode3, svgNode4]
      .map((r) => r.current)
      .filter(Boolean) as SVGGElement[]

    // Set initial state: paths fully offset, nodes invisible
    paths.forEach((path) => {
      const len = path.getTotalLength()
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len })
    })
    gsap.set(nodeGroups, { autoAlpha: 0, scale: 0.8, transformOrigin: 'center center' })

    // Timeline: node 1 pops in → line draws → next node pops in → repeat
    const tl = gsap.timeline({
      scrollTrigger: { trigger: rightContainerRef.current, start: 'top 80%', once: true },
      defaults: { ease: 'power2.inOut' },
    })

    tl.to(nodeGroups[0], { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(1.7)' })

    paths.forEach((path, i) => {
      const len = path.getTotalLength()
      tl.to(path, { strokeDashoffset: 0, duration: len * 0.013, ease: 'power2.inOut' }, '>')
      tl.to(nodeGroups[i + 1], { autoAlpha: 1, scale: 1, duration: 0.35, ease: 'back.out(1.7)' }, '>')
    })
  }, { scope: sectionRef })

  return (
    <section ref={sectionRef} id="problem" className="overflow-hidden bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="grid grid-cols-1 items-center gap-20 lg:grid-cols-2">

          {/* Left: raw typographic stats, no cards */}
          <div className="flex flex-col gap-14">
            <div>
              <p
                ref={stat1Ref}
                className="font-extrabold leading-none tracking-tight"
                style={{ fontSize: 'clamp(64px, 8vw, 96px)', color: '#0a0a0a' }}
              >
                $47,000
              </p>
              <p ref={label1Ref} className="mt-4 text-[15px] leading-snug text-gray-400">
                {'lost in 72 hours, one misconfigured agent'.split('').map((ch, i) => (
                  <span key={i} className="inline-block">
                    {ch === ' ' ? '\u00a0' : ch}
                  </span>
                ))}
              </p>
            </div>

            <div className="border-t border-gray-100 pt-12">
              <p
                ref={stat2Ref}
                className="font-extrabold leading-none tracking-tight"
                style={{ fontSize: 'clamp(64px, 8vw, 96px)', color: '#0a0a0a' }}
              >
                8,400x
              </p>
              <p ref={label2Ref} className="mt-4 text-[15px] leading-snug text-gray-400">
                {'retries ran unchecked, no kill-switch'.split('').map((ch, i) => (
                  <span key={i} className="inline-block">
                    {ch === ' ' ? '\u00a0' : ch}
                  </span>
                ))}
              </p>
            </div>
          </div>

          {/* Right: gray container (flow diagram + feature list) */}
          <div ref={rightContainerRef} className="flex flex-col gap-5">
            <div className="rounded-[20px] bg-[#F5F5F3] px-8 py-7">
              <p className="mb-5 font-mono text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                payment flow
              </p>

              {/* SVG flow diagram */}
              <svg
                viewBox="0 0 280 248"
                className="w-full"
                aria-hidden="true"
                role="img"
              >
                <defs>
                  <marker
                    id="ps-arrow"
                    markerWidth="7"
                    markerHeight="7"
                    refX="3.5"
                    refY="3.5"
                    orient="auto"
                  >
                    <path d="M 0,0 L 0,7 L 7,3.5 Z" fill="#16a34a" />
                  </marker>
                </defs>

                {/* Node 1: agent.run() */}
                <g ref={svgNode1}>
                  <rect x="85" y="0" width="110" height="36" rx="6" fill="#1e293b" />
                  <text
                    x="140" y="18"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="11"
                    fontFamily="ui-monospace, monospace"
                    fontWeight="600"
                  >
                    agent.run()
                  </text>
                </g>

                {/* Line 1 → 2 */}
                <path
                  ref={svgPath1}
                  d="M 140,36 L 140,70"
                  stroke="#16a34a"
                  strokeWidth="1.8"
                  fill="none"
                  markerEnd="url(#ps-arrow)"
                />

                {/* Node 2: sentinel.evaluate() */}
                <g ref={svgNode2}>
                  <rect x="30" y="70" width="220" height="36" rx="6" fill="#1e293b" />
                  <text
                    x="140" y="88"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="11"
                    fontFamily="ui-monospace, monospace"
                    fontWeight="600"
                  >
                    sentinel.evaluate()
                  </text>
                </g>

                {/* Line 2 → 3 */}
                <path
                  ref={svgPath2}
                  d="M 140,106 L 140,140"
                  stroke="#16a34a"
                  strokeWidth="1.8"
                  fill="none"
                  markerEnd="url(#ps-arrow)"
                />

                {/* Node 3: ✓ approved */}
                <g ref={svgNode3}>
                  <rect x="65" y="140" width="150" height="36" rx="6" fill="#052e16" />
                  <text
                    x="140" y="158"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fill="#4ade80"
                    fontSize="11"
                    fontFamily="ui-monospace, monospace"
                    fontWeight="700"
                  >
                    ✓ approved
                  </text>
                </g>

                {/* Line 3 → 4 */}
                <path
                  ref={svgPath3}
                  d="M 140,176 L 140,210"
                  stroke="#16a34a"
                  strokeWidth="1.8"
                  fill="none"
                  markerEnd="url(#ps-arrow)"
                />

                {/* Node 4: shieldpay.escrow() */}
                <g ref={svgNode4}>
                  <rect x="10" y="210" width="260" height="38" rx="8" fill="#1e293b" />
                  <text
                    x="140" y="229"
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fill="#f8fafc"
                    fontSize="11"
                    fontFamily="ui-monospace, monospace"
                    fontWeight="600"
                  >
                    shieldpay.escrow()
                  </text>
                </g>
              </svg>
            </div>

            {/* 3-col feature list: thin top-border dividers, no cards */}
            <div className="grid grid-cols-3">
              {features.map((f, i) => (
                <div
                  key={i}
                  className={`border-t border-gray-200 pt-4 ${i > 0 ? 'pl-5' : ''} ${i < 2 ? 'pr-5' : ''}`}
                >
                  <span className="text-green-600">{f.icon}</span>
                  <p className="mt-2 text-sm font-semibold text-gray-800">{f.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-400">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
