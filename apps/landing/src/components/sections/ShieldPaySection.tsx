import type { ReactNode } from 'react'
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  CircleCheck,
  Route,
  Wallet,
} from 'lucide-react'

function PipelineStep({
  step,
  title,
  description,
  icon: Icon,
  children,
}: {
  step: string
  title: string
  description: string
  icon: typeof Route
  children?: ReactNode
}) {
  return (
    <div className="relative flex flex-1 flex-col rounded-lg border border-zinc-200/90 bg-white p-3 shadow-sm ring-1 ring-zinc-100">
      <span className="font-mono text-[9px] font-medium tabular-nums text-zinc-400">{step}</span>
      <div className="mt-2 flex h-7 w-7 items-center justify-center rounded-md bg-[#14532d]/10 text-[#166534]">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
      </div>
      <h4 className="mt-2 text-xs font-semibold text-zinc-900">{title}</h4>
      <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{description}</p>
      {children ? <div className="mt-3 border-t border-zinc-100 pt-3">{children}</div> : null}
    </div>
  )
}

export default function ShieldPaySection() {
  return (
    <div className="w-full max-w-full px-0 py-1">
      <div className="flex flex-col gap-8 md:flex-row md:items-stretch md:gap-8 lg:gap-10">
        <div className="min-w-0 flex-1 md:max-w-[46%] lg:max-w-[44%]">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#86c49a]">
            <Wallet className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            ShieldPay
          </span>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            ShieldPay is the payments layer
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            After Sentinel approves, ShieldPay funds escrow (Trustless Work), proxies HTTP to the
            hosted x402 facilitator (OpenZeppelin + Stellar on{' '}
            <span className="font-mono text-[11px] text-zinc-200 sm:text-xs">
              channels.openzeppelin.com
            </span>
            ), forwards verify and settle, releases or refunds escrow as needed, and coordinates
            MPP-style session logic for the MVP.
          </p>
        </div>

        <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 p-3 ring-1 ring-white/10 backdrop-blur-sm md:max-w-[54%] lg:max-w-[56%]">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-300">
              Execution pipeline
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#14532d]/30 px-2 py-0.5 text-[10px] font-medium text-[#86c49a] ring-1 ring-white/10">
              <Wallet className="h-3 w-3" strokeWidth={2} aria-hidden />
              Post-approval
            </span>
          </div>

          <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-stretch md:gap-1.5">
            <PipelineStep
              step="01"
              icon={Route}
              title="Route"
              description="Fund Trustless Work escrow; x402 via OpenZeppelin + Stellar."
            >
              <p className="text-[10px] font-medium text-zinc-800">Trustless Work escrow</p>
              <p className="mt-0.5 font-mono text-[9px] text-[#166534]">funded · awaiting</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full w-4/5 rounded-full bg-[#166534]" />
              </div>
            </PipelineStep>

            <div className="flex shrink-0 items-center justify-center py-0.5 md:flex-col md:justify-center md:py-0 md:px-0.5">
              <ArrowDown className="h-4 w-4 text-zinc-500 md:hidden" strokeWidth={1.5} aria-hidden />
              <ArrowRight className="hidden h-4 w-4 shrink-0 text-zinc-500 md:block" strokeWidth={1.5} aria-hidden />
            </div>

            <PipelineStep
              step="02"
              icon={BadgeCheck}
              title="Verify"
              description="Proxy to facilitator; require Sentinel-signed approval."
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-medium text-zinc-800">Signed</span>
                <span className="shrink-0 rounded-full bg-[#14532d]/12 px-1.5 py-0.5 text-[8px] font-bold uppercase text-[#166534]">
                  OK
                </span>
              </div>
              <p className="mt-1 font-mono text-[9px] text-zinc-500">sentinel_sig 0x7a3f…</p>
            </PipelineStep>

            <div className="flex shrink-0 items-center justify-center py-0.5 md:flex-col md:justify-center md:py-0 md:px-0.5">
              <ArrowDown className="h-4 w-4 text-zinc-500 md:hidden" strokeWidth={1.5} aria-hidden />
              <ArrowRight className="hidden h-4 w-4 shrink-0 text-zinc-500 md:block" strokeWidth={1.5} aria-hidden />
            </div>

            <PipelineStep
              step="03"
              icon={CircleCheck}
              title="Settle"
              description="Release or refund escrow; MPP-style sessions where needed."
            >
              <div className="rounded-md bg-zinc-50 py-2 text-center">
                <p className="text-[10px] font-semibold text-zinc-900">Complete</p>
                <p className="mt-0.5 font-mono text-[9px] text-[#166534]">tx settled</p>
              </div>
            </PipelineStep>
          </div>
        </div>
      </div>
    </div>
  )
}
