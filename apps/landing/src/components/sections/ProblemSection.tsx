'use client'

import { motion } from 'framer-motion'
import { fadeUpItem, staggerContainer } from '@/components/motion/scrollEntrance'

export default function ProblemSection() {
  return (
    <section id="problem" className="scroll-mt-24 bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="overflow-visible rounded-2xl border border-white/15 bg-zinc-950/55 p-8 shadow-2xl backdrop-blur-xl sm:p-10 lg:p-12">
          <motion.div
            className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2 lg:gap-24"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.14, margin: '0px 0px -56px 0px' }}
            variants={staggerContainer}
          >
            {/* Left — text */}
            <motion.div variants={fadeUpItem} className="will-change-transform">
              <span className="inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-[#86c49a]">
                The Problem
              </span>

              <h2 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Autonomous agents burn budgets while you sleep
              </h2>

              <p className="mt-6 text-lg leading-relaxed text-zinc-300">
                AI agents operating without spend controls can enter retry loops, duplicate API calls,
                or trigger on-chain transactions thousands of times before a human notices.
                One misconfigured agent cost a team $47,000 in 72 hours.
              </p>

              <p className="mt-4 text-lg leading-relaxed text-zinc-300">
                Existing infrastructure has no concept of agent-level budget governance. Rate limits exist,
                but they don&apos;t prevent economic damage — they just slow it down.
              </p>

              <p className="mt-4 text-lg leading-relaxed text-zinc-300">
                There is no kill-switch built into the payment layer. By the time you see the invoice,
                the damage is already done.
              </p>
            </motion.div>

            {/* Right — visual */}
            <motion.div
              variants={fadeUpItem}
              className="relative flex min-h-0 justify-center py-10 pr-6 sm:pr-10 lg:justify-end will-change-transform"
            >
              <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#142e24] bg-[#0B1F17] px-7 py-6 shadow-[0_32px_64px_-16px_rgba(5,46,22,0.45)] ring-1 ring-[#14532d]/40 sm:max-w-xl sm:px-8 sm:py-7 lg:min-h-[28rem]">
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

              <div className="absolute -top-2 -right-2 z-10 w-44 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-md sm:right-0">
                <p className="text-2xl font-bold text-white">$47,000</p>
                <p className="mt-0.5 text-xs font-semibold text-[#fca5a5]">Lost in 72 hours</p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  Claude Opus loop with no spend policy set
                </p>
              </div>

              <div className="absolute -bottom-2 -right-2 z-10 w-44 rounded-2xl border border-white/20 bg-white/10 p-4 shadow-lg backdrop-blur-md sm:right-0">
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
    </section>
  )
}
