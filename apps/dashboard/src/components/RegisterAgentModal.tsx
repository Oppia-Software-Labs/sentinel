'use client'

import { useState } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const EMPTY = { agentId: '', endpoint: '', description: '', type: 'custom' as 'shieldpay' | 'custom' }

export function RegisterAgentModal() {
  const [open, setOpen]       = useState(false)
  const [saving, setSaving]   = useState(false)
  const [form, setForm]       = useState(EMPTY)

  function set(field: keyof typeof EMPTY, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function normalizeId(v: string) {
    return v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')
  }

  async function handleSubmit() {
    const agentId = form.agentId.trim()
    const endpoint = form.endpoint.trim()

    if (!agentId) { toast.error('Agent ID is required'); return }
    if (!endpoint) { toast.error('Endpoint URL is required'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          endpoint,
          description: form.description.trim() || undefined,
          type: form.type,
        }),
      })

      const body = await res.json().catch(() => ({}))

      if (res.ok) {
        toast.success('Agent registered', {
          description: `${agentId} added to Soroban + Supabase.`,
        })
        setForm(EMPTY)
        setOpen(false)
      } else {
        toast.error('Registration failed', {
          description: body.error ?? `HTTP ${res.status}`,
        })
      }
    } catch {
      toast.error('Registration failed', {
        description: 'Network error — is ShieldPay running on port 4000?',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Register Agent
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Register a new agent</DialogTitle>
          <DialogDescription>
            Adds the agent on-chain (Soroban) and mirrors it to Supabase.
            The agent must expose a POST endpoint that accepts voting requests.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Agent ID */}
          <div className="space-y-1.5">
            <Label htmlFor="agentId" className="text-xs">Agent ID</Label>
            <Input
              id="agentId"
              placeholder="my-agent"
              value={form.agentId}
              onChange={e => set('agentId', normalizeId(e.target.value))}
              className="font-mono text-sm h-9"
            />
            <p className="text-[10px] text-muted-foreground">
              Lowercase, hyphens allowed. Used as the on-chain identifier.
            </p>
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <div className="flex gap-2">
              {(['custom', 'shieldpay'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set('type', t)}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                    form.type === t
                      ? t === 'shieldpay'
                        ? 'bg-emerald-900/12 text-emerald-900 border-emerald-900/25'
                        : 'bg-emerald-900/8 text-emerald-800 border-emerald-900/18'
                      : 'bg-transparent text-muted-foreground border-border hover:border-border/80'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Endpoint */}
          <div className="space-y-1.5">
            <Label htmlFor="endpoint" className="text-xs">Endpoint URL</Label>
            <Input
              id="endpoint"
              placeholder="https://my-agent.example.com/vote"
              value={form.endpoint}
              onChange={e => set('endpoint', e.target.value)}
              className="font-mono text-sm h-9"
            />
            <p className="text-[10px] text-muted-foreground">
              Must accept <span className="font-mono">POST</span> with{' '}
              <span className="font-mono">{'{ intent, context }'}</span> and return{' '}
              <span className="font-mono">{'{ decision, reason }'}</span>.
            </p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="description"
              placeholder="What does this agent evaluate?"
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="text-sm h-9"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {saving ? 'Registering…' : 'Register'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
