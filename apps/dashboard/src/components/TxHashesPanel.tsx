'use client'

import { useState } from 'react'
import { Copy, ExternalLink, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types'

interface HashRowProps {
  label: string
  value: string | null
  href?: string
}

function HashRow({ label, value, href }: HashRowProps) {
  const [copied, setCopied] = useState(false)

  function copy() {
    if (!value) return
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium w-32 shrink-0">
        {label}
      </span>
      {value ? (
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-mono text-[11px] text-foreground truncate max-w-[280px]">
            {value}
          </span>
          <button
            onClick={copy}
            className="shrink-0 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            title="Copy"
          >
            {copied ? (
              <Check className="h-3 w-3 text-emerald-800" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground/50 hover:text-emerald-800 transition-colors"
              title="View on Stellar Expert"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      ) : (
        <span className="text-[11px] text-muted-foreground/40 font-mono">—</span>
      )}
    </div>
  )
}

const NET = 'testnet'

interface Props {
  transaction: Transaction
}

export function TxHashesPanel({ transaction: tx }: Props) {
  const hashes: { label: string; value: string | null; href?: string }[] = [
    {
      label: 'Governance Hash',
      value: tx.stellar_tx_hash,
      href: tx.stellar_tx_hash
        ? `https://stellar.expert/explorer/${NET}/tx/${tx.stellar_tx_hash}`
        : undefined,
    },
    {
      label: 'Escrow Contract',
      value: tx.escrow_contract_id,
      href: tx.escrow_contract_id
        ? `https://stellar.expert/explorer/${NET}/contract/${tx.escrow_contract_id}`
        : undefined,
    },
    {
      label: 'Payment TX',
      value: tx.payment_tx_hash,
      href: tx.payment_tx_hash
        ? `https://stellar.expert/explorer/${NET}/tx/${tx.payment_tx_hash}`
        : undefined,
    },
  ]

  const hasAny = hashes.some((h) => h.value)

  return (
    <div className={cn(!hasAny && 'opacity-50')}>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-3">
        Transaction Hashes
      </p>
      <div className="flex flex-col gap-2">
        {hashes.map((h) => (
          <HashRow key={h.label} label={h.label} value={h.value} href={h.href} />
        ))}
      </div>
    </div>
  )
}
