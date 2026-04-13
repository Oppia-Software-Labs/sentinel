import { Terminal } from 'lucide-react'

export default function SentinelSection() {
  return (
    <div className="w-full max-w-full px-0 py-1">
      <div className="flex flex-col gap-8 md:flex-row md:items-stretch md:gap-8 lg:gap-10">
        <div className="min-w-0 flex-1 md:max-w-[46%] lg:max-w-[44%]">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-[#86c49a]">
            <Terminal className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            Sentinel
          </span>
          <h3 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Sentinel is the governance layer
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            It answers whether a payment is allowed: multi-agent voting, spend rules (policy), and a
            clear approve or reject outcome. It does{' '}
            <span className="font-medium text-zinc-200">not</span> move funds or call Trustless Work.
          </p>
        </div>

        <div className="min-w-0 flex-1 md:max-w-[54%] lg:max-w-[56%]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
              Live evaluation
            </p>
            <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] font-medium text-zinc-300">
              trace · v1
            </span>
          </div>

          <div className="rounded-xl bg-linear-to-b from-zinc-100 to-zinc-200/80 p-1 shadow-md ring-1 ring-zinc-300/60">
            <div className="overflow-hidden rounded-lg border border-[#142e24] bg-[#0B1F17] shadow-inner">
              <div className="flex items-center gap-1.5 border-b border-white/8 bg-[#081a14] px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-[#ef4444]/90" />
                <span className="h-2 w-2 rounded-full bg-[#eab308]/90" />
                <span className="h-2 w-2 rounded-full bg-[#166534]" />
                <span className="ml-1.5 font-mono text-[10px] text-white/35">sentinel · zsh</span>
              </div>
              <div className="space-y-1.5 px-3 py-3 font-mono text-[11px] leading-relaxed text-white/90 sm:text-xs">
                <p className="text-[#15803d]">&gt; Evaluating transaction...</p>
                <p className="text-white/45">intent_id pay_8f2a · 1,250 USDC · escrow</p>
                <p className="text-[#86c49a]">&gt; Policy check passed</p>
                <p className="text-white/40">production_v3 · daily_cap OK</p>
                <p className="text-[#15803d]">&gt; Multi-agent consensus reached</p>
                <p className="text-white/45">quorum 3/3 · approve ×3</p>
                <p className="text-[#86c49a]">&gt; Approved</p>
                <p className="border-t border-white/6 pt-2 text-[10px] text-white/30">
                  signed for ShieldPay · 14ms
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
