'use client'

import { motion } from 'framer-motion'
import {
  Activity,
  FileSearch,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  UsersRound,
} from 'lucide-react'
import {
  sectionRevealViewport,
  slideFromTop,
  staggerContainer,
  staggerFromTop,
} from '@/components/motion/scrollEntrance'

function BentoCard({
  icon: Icon,
  title,
  description,
  highlighted,
  className,
}: {
  icon: typeof UsersRound
  title: string
  description: string
  highlighted?: boolean
  className?: string
}) {
  const base =
    'flex flex-col rounded-2xl border p-6 shadow-md transition-shadow duration-300 hover:shadow-lg md:p-7'
  const normal =
    'border-zinc-200/90 bg-linear-to-br from-white to-zinc-50/95'
  const hi =
    'border-[#166534]/25 bg-linear-to-br from-white via-[#f0fdf4]/90 to-[#dcfce7]/40 shadow-xl ring-1 ring-[#14532d]/15'

  return (
    <motion.div
      variants={slideFromTop}
      className={`${base} ${highlighted ? hi : normal} ${className ?? ''} will-change-transform`}
    >
      <span
        className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${
          highlighted
            ? 'bg-[#14532d] text-[#86c49a]'
            : 'bg-[#14532d]/10 text-[#166534]'
        }`}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <h3
        className={`mt-5 font-bold tracking-tight text-zinc-900 ${highlighted ? 'text-xl md:text-2xl' : 'text-lg'}`}
      >
        {title}
      </h3>
      <p
        className={`mt-2 leading-relaxed text-zinc-600 ${highlighted ? 'text-sm md:text-base' : 'text-sm'}`}
      >
        {description}
      </p>
    </motion.div>
  )
}

export default function BentoGrid() {
  return (
    <section id="features" className="scroll-mt-24 bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <motion.div
          className="flex flex-col"
          variants={staggerFromTop}
          initial="hidden"
          whileInView="show"
          viewport={sectionRevealViewport}
        >
          <motion.div
            variants={slideFromTop}
            className="mb-6 flex flex-col gap-4 will-change-transform sm:mb-7 sm:flex-row sm:items-end sm:justify-between sm:gap-6"
          >
            <div className="max-w-xl">
              <span className="inline-block rounded-full border border-[#166534]/25 bg-[#14532d]/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-[#166534]">
                Platform
              </span>
              <h2 className="mt-3 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
                Everything you need to govern agent spend
              </h2>
            </div>
            <p className="max-w-md text-base leading-relaxed text-zinc-500 sm:text-right md:text-lg">
              Policy through execution — one stack for approvals, limits, monitoring, and audit-ready
              trails.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 gap-3 md:grid-cols-3 md:grid-rows-3 md:gap-4"
            variants={staggerContainer}
          >
          <BentoCard
            className="md:col-span-2 md:row-span-2 md:row-start-1 md:col-start-1"
            highlighted
            icon={UsersRound}
            title="Multi-agent Approval"
            description="Require M-of-N consensus before any intent becomes a payment. Quorums per tier, role, or spend band — enforced before ShieldPay sees a signature."
          />
          <BentoCard
            className="md:col-start-3 md:row-start-1"
            icon={FileSearch}
            title="Policy Engine"
            description="Compose rules that run at intent time: caps, allowlists, velocity checks, and custom predicates."
          />
          <BentoCard
            className="md:col-start-3 md:row-start-2"
            icon={SlidersHorizontal}
            title="Spend Limits"
            description="Per-call, session, and rolling windows — block overruns before they hit your ledger."
          />
          <BentoCard
            className="md:col-start-1 md:row-start-3"
            icon={Activity}
            title="Real-time Monitoring"
            description="Live stream of intents, votes, and policy outcomes with actionable context."
          />
          <BentoCard
            className="md:col-start-2 md:row-start-3"
            icon={ScrollText}
            title="Audit Logs"
            description="Immutable, queryable history for compliance — who approved what, when, and why."
          />
          <BentoCard
            className="md:col-start-3 md:row-start-3"
            icon={ShieldCheck}
            title="Fail-safe Execution"
            description="If governance fails closed, execution never starts. Escrow and routing only after a valid approval."
          />
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
