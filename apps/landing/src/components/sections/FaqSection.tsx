'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { easeOutExpo } from '@/components/motion/scrollEntrance'

const faqs = [
  {
    question: 'What is the difference between Sentinel and ShieldPay?',
    answer:
      "Sentinel is the governance layer. It evaluates spend policies, coordinates multi-agent consensus votes, and issues approvals or rejections — without ever touching funds. ShieldPay is the payment execution layer. It receives Sentinel's signed approval and routes the payment through the x402 facilitator proxy, Trustless Work escrow, or an MPP session on Stellar.",
  },
  {
    question: 'Does Sentinel move funds or interact with escrow directly?',
    answer:
      'No. Sentinel only issues signed approvals or rejections. Funds move exclusively through ShieldPay, and only after Sentinel signs off. This separation ensures the governance layer cannot be shortcut at the payment layer — even by a compromised agent.',
  },
  {
    question: 'Which blockchains and payment protocols are supported?',
    answer:
      'ShieldPay supports x402 (HTTP-native payments), Stellar via MPP (Micropayment Protocol), and Trustless Work escrow on EVM-compatible chains. Sentinel is chain-agnostic — it governs payment intent, not execution protocol.',
  },
  {
    question: 'How does the multi-agent consensus voting work?',
    answer:
      'When a payment intent is submitted, Sentinel fans it out to the configured agent signatories. Each agent votes approve or reject. The intent proceeds only if the quorum threshold (e.g., 3-of-5) is reached within the session window.',
  },
  {
    question: 'Can I use only Sentinel or only ShieldPay without the full stack?',
    answer:
      'Yes. Sentinel can be used standalone as a governance and policy enforcement engine. ShieldPay can be used standalone as a payment facilitator. Running both gives the strongest guarantee: every intent governed before execution, every execution settled trustlessly.',
  },
  {
    question: 'What happens if an agent exceeds its spend policy mid-session?',
    answer:
      "Sentinel blocks the payment intent at policy evaluation time and returns a structured rejection with the violation reason. Depending on your configuration, Sentinel can also freeze the agent's session until a human operator resumes it via the dashboard.",
  },
]

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="scroll-mt-24 bg-white py-24 sm:py-32">
      <motion.div
        className="mx-auto mb-10 max-w-7xl px-6 lg:px-10"
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2, margin: '0px 0px -40px 0px' }}
        transition={{ duration: 0.65, ease: easeOutExpo }}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-lg">
            <span className="inline-block rounded-full border border-[#166534]/20 bg-[#14532d]/10 px-4 py-1.5 text-sm font-semibold uppercase tracking-widest text-[#166534]">
              FAQ
            </span>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl">
              Everything you need to know
            </h2>
          </div>
          <p className="max-w-md text-base leading-relaxed text-zinc-500 sm:text-right md:text-lg">
            Clear answers about how Sentinel and ShieldPay work together — and separately — for
            integrators and operators.
          </p>
        </div>
      </motion.div>

      <motion.div
        className="mx-auto max-w-7xl px-6 lg:px-10"
        initial={{ opacity: 0, y: 36 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15, margin: '0px 0px -48px 0px' }}
        transition={{ duration: 0.75, delay: 0.08, ease: easeOutExpo }}
      >
        <div className="relative flex h-[680px] items-center justify-center overflow-hidden rounded-3xl">
          <div className="absolute inset-0 z-0 bg-[url('/hero/hero.svg')] bg-cover bg-center brightness-95" />

          <div className="relative z-10 mx-auto max-h-[420px] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/15 bg-zinc-950/55 p-9 shadow-2xl backdrop-blur-xl">
            <h2 className="mb-6 text-xl font-bold text-white">Frequently Asked Questions</h2>

            {faqs.map((faq, i) => {
              const isOpen = openIndex === i
              const isFirst = i === 0
              return (
                <div
                  key={i}
                  className={
                    isFirst ? '' : 'border-t border-white/10'
                  }
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 py-4 text-left"
                  >
                    <span
                      className={`text-sm font-semibold leading-snug transition-colors duration-200 ${
                        isOpen ? 'text-[#86c49a]' : 'text-white'
                      }`}
                    >
                      {faq.question}
                    </span>
                    <svg
                      className={`h-4 w-4 shrink-0 text-white transition-transform duration-300 ease-out ${
                        isOpen ? 'rotate-180' : 'rotate-0'
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2.5}
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>

                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                      isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-4 text-[0.9rem] leading-relaxed text-white/65">{faq.answer}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </motion.div>
    </section>
  )
}
