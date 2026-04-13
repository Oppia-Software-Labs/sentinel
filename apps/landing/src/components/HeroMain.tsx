'use client'

import { motion } from 'framer-motion'
import { sectionRevealViewport, slideFromTop, staggerFromTop } from '@/components/motion/scrollEntrance'

export default function HeroMain() {
  return (
    <main className="relative flex h-screen w-full flex-col overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[url('/hero/hero.svg')] bg-cover bg-center brightness-93" />

      <div className="pointer-events-none absolute inset-0 z-1 backdrop-blur-[10px] mask-[linear-gradient(to_bottom,transparent_35%,black_65%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_35%,black_65%)]" />

      <motion.div
        className="absolute bottom-0 left-0 right-0 z-10 mb-24 flex w-full items-end justify-between px-7 pb-14 sm:px-10 sm:pb-20"
        variants={staggerFromTop}
        initial="hidden"
        whileInView="show"
        viewport={sectionRevealViewport}
      >
        <motion.div variants={slideFromTop} className="max-w-3xl">
          <h1 className="text-[2.6rem] font-bold leading-[1.08] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Stop AI agents from
            <br />
            burning your budget.
          </h1>

          <p className="mt-4 max-w-lg text-base font-normal leading-relaxed text-white/80 sm:mt-5 sm:text-lg">
            Approve, enforce, and execute every payment with Sentinel + ShieldPay using policies,
            multi-agent validation, and secure escrow to prevent costly mistakes before they happen.
          </p>

          <div className="mt-7">
            <a
              href="#"
              className="inline-block rounded-md bg-white px-6 py-3 text-sm font-medium text-zinc-950 transition-opacity hover:opacity-90"
            >
              Launch App
            </a>
          </div>
        </motion.div>

        <motion.div variants={slideFromTop} className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="text-base font-semibold text-white/60">Built by</span>
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/oppia.svg" alt="" className="h-14 w-auto brightness-0 invert" />
          </div>
        </motion.div>
      </motion.div>
    </main>
  )
}
