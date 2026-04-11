'use client'

import { useState, KeyboardEvent } from 'react'
import { X, Plus, Save, Loader2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// 1 USDC = 10_000_000 contract units
const STROOPS_PER_USDC = 10_000_000

interface StoredRules {
  max_per_task?: string | number
  max_per_hour?: string | number
  max_per_day?: string | number
  alert_threshold?: string | number
  blocked_vendors?: string[]
}

interface Props {
  initialRules: StoredRules | null
}

function stroopsToUsdc(val: string | number | undefined): string {
  if (val == null || val === '') return ''
  const n = Number(val) / STROOPS_PER_USDC
  return isNaN(n) ? '' : String(n)
}

export function PolicyForm({ initialRules }: Props) {
  const [maxPerTask,      setMaxPerTask]      = useState(stroopsToUsdc(initialRules?.max_per_task))
  const [maxPerHour,      setMaxPerHour]      = useState(stroopsToUsdc(initialRules?.max_per_hour))
  const [maxPerDay,       setMaxPerDay]       = useState(stroopsToUsdc(initialRules?.max_per_day))
  const [alertThreshold,  setAlertThreshold]  = useState(stroopsToUsdc(initialRules?.alert_threshold))
  const [vendors,         setVendors]         = useState<string[]>(initialRules?.blocked_vendors ?? [])
  const [vendorInput,     setVendorInput]     = useState('')
  const [saving,          setSaving]          = useState(false)

  function addVendor() {
    const trimmed = vendorInput.trim().toLowerCase()
    if (trimmed && !vendors.includes(trimmed)) {
      setVendors((prev) => [...prev, trimmed])
    }
    setVendorInput('')
  }

  function removeVendor(v: string) {
    setVendors((prev) => prev.filter((x) => x !== v))
  }

  function onVendorKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addVendor()
    }
    if (e.key === 'Backspace' && vendorInput === '' && vendors.length > 0) {
      setVendors((prev) => prev.slice(0, -1))
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_per_task:    parseFloat(maxPerTask)    || 0,
          max_per_hour:    parseFloat(maxPerHour)    || 0,
          max_per_day:     parseFloat(maxPerDay)     || 0,
          alert_threshold: parseFloat(alertThreshold)|| 0,
          blocked_vendors: vendors,
        }),
      })

      if (res.ok) {
        toast.success('Policy saved', {
          description: 'Limits updated in Supabase mirror.',
        })
      } else {
        const body = await res.json().catch(() => ({}))
        toast.error('Save failed', { description: body.error ?? 'Unknown error' })
      }
    } catch {
      toast.error('Save failed', { description: 'Network error.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8 max-w-2xl">

      {/* Transaction limits */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold">Transaction Limits</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hard stops — the on-chain policy engine rejects any payment that exceeds these.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <NumberField
            id="max_per_task"
            label="Per Transaction"
            hint="Max USDC per single payment"
            value={maxPerTask}
            onChange={setMaxPerTask}
          />
          <NumberField
            id="max_per_hour"
            label="Per Hour"
            hint="Rolling 1-hour window"
            value={maxPerHour}
            onChange={setMaxPerHour}
          />
          <NumberField
            id="max_per_day"
            label="Per Day"
            hint="Rolling 24-hour window"
            value={maxPerDay}
            onChange={setMaxPerDay}
          />
        </div>
      </section>

      {/* Alert threshold */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold">Alert Threshold</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fires a Slack alert without blocking — useful for detecting spend anomalies early.
          </p>
        </div>
        <div className="max-w-[180px]">
          <NumberField
            id="alert_threshold"
            label="Threshold (USDC)"
            hint="Alert at this amount"
            value={alertThreshold}
            onChange={setAlertThreshold}
          />
        </div>
      </section>

      {/* Blocked vendors */}
      <section>
        <div className="mb-4">
          <h2 className="text-sm font-semibold">Vendor Blocklist</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Payments to these vendors are rejected regardless of amount or consensus result.
          </p>
        </div>

        {/* Tag display + input */}
        <div className="flex flex-wrap items-center gap-1.5 min-h-10 rounded-md border border-input bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
          {vendors.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 bg-red-500/15 text-red-400 border border-red-500/25 rounded px-2 py-0.5 text-[11px] font-mono font-medium"
            >
              {v}
              <button
                type="button"
                onClick={() => removeVendor(v)}
                className="hover:text-red-300 transition-colors ml-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <input
            value={vendorInput}
            onChange={(e) => setVendorInput(e.target.value)}
            onKeyDown={onVendorKeyDown}
            onBlur={addVendor}
            placeholder={vendors.length === 0 ? 'Type a vendor name, press Enter…' : ''}
            className="flex-1 min-w-[160px] bg-transparent text-sm placeholder:text-muted-foreground outline-none"
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          Press <kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">Enter</kbd> or{' '}
          <kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[10px]">,</kbd> to add.
          Click a tag to remove it.
        </p>

        {/* Quick-add suggestions */}
        {vendors.length === 0 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
              Suggestions:
            </span>
            {['evil-vendor', 'blocked-api', 'untrusted'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setVendors((prev) => [...prev, s])}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground border border-dashed border-border rounded px-2 py-0.5 hover:border-border/80 hover:text-foreground transition-colors"
              >
                <Plus className="h-2.5 w-2.5" />
                {s}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1.5">
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {saving ? 'Saving…' : 'Save policy'}
        </Button>
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <ShieldAlert className="h-3 w-3" />
          Stored in Supabase mirror. Update the Soroban contract via the SDK or CLI.
        </p>
      </div>
    </div>
  )
}

function NumberField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string
  label: string
  hint: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm select-none">
          $
        </span>
        <Input
          id={id}
          type="number"
          min="0"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-7 font-mono text-sm h-9"
          placeholder="0"
        />
      </div>
      <p className="text-[10px] text-muted-foreground">{hint}</p>
    </div>
  )
}
