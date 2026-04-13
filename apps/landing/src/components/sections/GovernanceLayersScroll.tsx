'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { easeOutExpo } from '@/components/motion/scrollEntrance'
import SentinelSection from '@/components/sections/SentinelSection'
import ShieldPaySection from '@/components/sections/ShieldPaySection'

/** Perlin smootherstep — ends are softer than plain smoothstep. */
function smootherstep01(t: number) {
  const x = Math.max(0, Math.min(1, t))
  return x * x * x * (x * (x * 6 - 15) + 10)
}

export default function GovernanceLayersScroll() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  const FADE_START = 0.18
  const FADE_END = 0.78

  const sentinelOpacity = useTransform(scrollYProgress, (p) => {
    if (p <= FADE_START) return 1
    if (p >= FADE_END) return 0
    return 1 - smootherstep01((p - FADE_START) / (FADE_END - FADE_START))
  })

  const shieldOpacity = useTransform(scrollYProgress, (p) => {
    if (p <= FADE_START) return 0
    if (p >= FADE_END) return 1
    return smootherstep01((p - FADE_START) / (FADE_END - FADE_START))
  })

  const sentinelY = useTransform(scrollYProgress, (p) => {
    if (p <= FADE_START) return 0
    if (p >= FADE_END) return -10
    return -10 * smootherstep01((p - FADE_START) / (FADE_END - FADE_START))
  })

  const shieldY = useTransform(scrollYProgress, (p) => {
    if (p <= FADE_START) return 14
    if (p >= FADE_END) return 0
    return 14 * (1 - smootherstep01((p - FADE_START) / (FADE_END - FADE_START)))
  })

  const sentinelVisibility = useTransform(sentinelOpacity, (o) => (o < 0.03 ? 'hidden' : 'visible'))
  const shieldVisibility = useTransform(shieldOpacity, (o) => (o < 0.03 ? 'hidden' : 'visible'))

  return (
    <section id="governance" className="scroll-mt-24 bg-white py-24 sm:py-32" aria-label="Sentinel and ShieldPay">
      <motion.div
        className="mx-auto mb-4 max-w-7xl px-6 sm:mb-5 lg:px-10"
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2, margin: '0px 0px -40px 0px' }}
        transition={{ duration: 0.65, ease: easeOutExpo }}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="max-w-lg">
            <span className="inline-block rounded-full border border-[#166534]/20 bg-[#14532d]/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-[#166534]">
              The Solution
            </span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
              Governance, then execution
            </h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-zinc-500 sm:text-right md:text-lg">
            Sentinel decides if a payment should happen. ShieldPay runs it when it&apos;s approved —
            two layers, one flow from policy to settlement.
          </p>
        </div>
      </motion.div>

      <div ref={containerRef} className="relative h-[340vh]">
        <div className="sticky top-0 z-0 flex min-h-[100dvh] flex-col items-center justify-start pt-3 pb-10 sm:pt-4 sm:pb-12">
          <motion.div
            className="mx-auto w-full max-w-7xl px-6 lg:px-10"
            initial={{ opacity: 0, y: 36 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15, margin: '0px 0px -48px 0px' }}
            transition={{ duration: 0.75, delay: 0.08, ease: easeOutExpo }}
          >
            <div className="relative flex h-[min(92vh,820px)] min-h-[640px] items-center justify-center overflow-hidden rounded-3xl sm:min-h-[700px] lg:h-[760px]">
              <div
                className="pointer-events-none absolute inset-0 z-0 bg-[url('/hero/hero.svg')] bg-cover bg-center brightness-95"
                aria-hidden
              />

              <div className="relative z-10 mx-auto w-[92%] max-w-5xl max-h-[min(50vh,480px)] overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950/55 p-6 shadow-2xl backdrop-blur-xl sm:max-h-[460px] sm:p-7">
                <div className="relative min-h-[280px] w-full sm:min-h-[300px] lg:min-h-[340px]">
                  <motion.div
                    style={{
                      opacity: sentinelOpacity,
                      y: sentinelY,
                      visibility: sentinelVisibility,
                    }}
                    className="absolute inset-0 z-1 overflow-x-hidden overflow-y-auto rounded-2xl"
                  >
                    <SentinelSection />
                  </motion.div>

                  <motion.div
                    style={{
                      opacity: shieldOpacity,
                      y: shieldY,
                      visibility: shieldVisibility,
                    }}
                    className="absolute inset-0 z-2 overflow-x-hidden overflow-y-auto rounded-2xl"
                  >
                    <ShieldPaySection />
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
