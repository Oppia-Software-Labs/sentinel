'use client'

import { motion } from 'framer-motion'
import {
  sectionRevealViewport,
  slideFromTop,
  staggerFromTop,
} from '@/components/motion/scrollEntrance'

const glassInnerViewport = {
  once: false as const,
  amount: 0.22 as const,
  margin: '0px 0px -48px 0px' as const,
}

export default function ProblemSection() {
  return (
    <section id="problem" className="scroll-mt-24 bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <motion.div
          className="flex flex-col gap-8 sm:gap-10"
          variants={staggerFromTop}
          initial="hidden"
          whileInView="show"
          viewport={sectionRevealViewport}
        >
          <motion.div
            variants={slideFromTop}
            className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6"
          >
            <div className="max-w-lg">
              <span className="inline-block rounded-full border border-[#166534]/20 bg-[#14532d]/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-[#166534]">
                The Problem
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                Agents burn budgets overnight
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-zinc-500 sm:max-w-xs sm:text-right sm:text-base">
              Retries and duplicate calls drain funds before you notice — no kill-switch on the payment
              layer.
            </p>
          </motion.div>

          <motion.div variants={slideFromTop}>
            <div className="relative flex min-h-[640px] h-[min(92vh,820px)] items-center justify-center overflow-hidden rounded-3xl sm:min-h-[700px] lg:h-[760px]">
              <div
                className="pointer-events-none absolute inset-0 z-0 bg-[url('/hero/hero2.jpeg')] bg-cover bg-center brightness-[0.88]"
                aria-hidden
              />

              <div className="relative z-10 flex w-full justify-center px-4 py-10 sm:py-12">
                <motion.div
                  className="grid min-h-[380px] w-[92%] max-w-5xl max-h-[min(68vh,640px)] grid-cols-1 items-center gap-10 overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950/72 p-6 shadow-2xl sm:min-h-[420px] sm:max-h-[min(62vh,600px)] sm:p-7 lg:min-h-[480px] lg:max-h-[min(70vh,680px)] lg:grid-cols-2 lg:gap-16"
                  variants={staggerFromTop}
                  initial="hidden"
                  whileInView="show"
                  viewport={glassInnerViewport}
                >
                  <motion.div variants={slideFromTop} className="will-change-transform">
                    <p className="text-base leading-relaxed text-zinc-300">
                      Without spend controls, agents hit retry loops and on-chain calls thousands of times
                      before a human sees it — one misconfiguration cost a team $47k in 72 hours.
                    </p>

                    <p className="mt-3 text-base leading-relaxed text-zinc-300">
                      Rate limits slow abuse; they don&apos;t stop economic damage. There&apos;s no
                      agent-level budget governance in the stack.
                    </p>

                    <p className="mt-3 text-base leading-relaxed text-zinc-300">
                      No kill-switch in the payment path: by the time the invoice lands, it&apos;s too late.
                    </p>
                  </motion.div>

                  <motion.div
                    variants={slideFromTop}
                    className="relative flex min-h-0 justify-center py-4 pr-0 sm:pr-10 lg:justify-end will-change-transform"
                  >
                    <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#142e24] bg-[#0B1F17] px-7 py-6 shadow-[0_32px_64px_-16px_rgba(5,46,22,0.45)] ring-1 ring-[#14532d]/40 sm:max-w-xl sm:px-8 sm:py-7 lg:min-h-112">
                      <div className="mb-4 flex items-center gap-2 border-b border-white/8 pb-3">
                        <span className="h-3 w-3 rounded-full bg-[#ef4444]/90" />
                        <span className="h-3 w-3 rounded-full bg-[#eab308]/90" />
                        <span className="h-3 w-3 rounded-full bg-[#166534]" />
                        <span className="ml-2 font-mono text-xs text-white/35 sm:text-sm">agent.log</span>
                      </div>
                      <div className="space-y-2 font-mono text-sm leading-relaxed sm:text-[0.9375rem]">
                        <div className="text-[#86c49a]">{'> agent.run("purchase_flow")'}</div>
                        <div className="text-white/45">Attempt 1 ... failed. Retrying.</div>
                        <div className="text-white/45">Attempt 2 ... failed. Retrying.</div>
                        <div className="text-[#fca5a5]">ERROR: timeout — retrying indefinitely</div>
                        <div className="text-white/40">Attempt 847 ... failed.</div>
                        <div className="text-white/40">Attempt 1,203 ... failed.</div>
                        <div className="text-[#fde047]/90">WARN: spend threshold approaching</div>
                        <div className="text-white/40">Attempt 3,916 ... failed.</div>
                        <div className="text-white/40">Attempt 6,100 ... failed.</div>
                        <div className="font-semibold text-[#f87171]">
                          CRITICAL: $47,000 debited · 8,400 calls
                        </div>
                        <div className="pt-2 text-xs text-white/30">
                          No policy. No kill-switch. No alert.
                        </div>
                      </div>
                    </div>

                    <div className="absolute -top-2 -right-2 z-10 w-44 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg sm:right-0">
                      <p className="text-2xl font-bold text-white">$47,000</p>
                      <p className="mt-0.5 text-xs font-semibold text-[#fca5a5]">Lost in 72 hours</p>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                        Claude Opus loop with no spend policy set
                      </p>
                    </div>

                    <div className="absolute -bottom-2 -right-2 z-10 w-44 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg sm:right-0">
                      <p className="text-2xl font-bold text-white">8,400×</p>
                      <p className="mt-0.5 text-xs font-semibold text-zinc-400">No kill-switch</p>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                        Retries ran unchecked until manual stop
                      </p>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
