'use client'

import { useState } from 'react'
import { Plus, Loader2, Bot, Globe, Sparkles, ArrowLeft, FlaskConical, Eye, EyeOff, Check, X } from 'lucide-react'
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

type Provider = 'openai' | 'anthropic'
type AgentMode = null | 'hosted' | 'custom'

interface HostedForm {
  agentId: string
  provider: Provider
  apiKey: string
  model: string
  systemPrompt: string
  temperature: number
  description: string
}

interface CustomForm {
  agentId: string
  endpoint: string
  description: string
}

const MODELS: Record<Provider, { id: string; label: string }[]> = {
  openai: [
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini (fast, cheap)' },
    { id: 'gpt-4o', label: 'GPT-4o (powerful)' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { id: 'gpt-4.1', label: 'GPT-4.1' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (balanced)' },
    { id: 'claude-haiku-4-20250514', label: 'Claude Haiku 4 (fast, cheap)' },
  ],
}

const DEFAULT_PROMPT = `You are a payment governance agent for an AI wallet. Evaluate whether each payment request should be approved or rejected.

Your criteria:
- Approve legitimate business expenses (cloud services, APIs, SaaS tools)
- Reject suspicious vendors or unusually large amounts
- Consider the daily/hourly spending context

Be concise in your reasoning.`

const EMPTY_HOSTED: HostedForm = {
  agentId: '',
  provider: 'openai',
  apiKey: '',
  model: 'gpt-4o-mini',
  systemPrompt: DEFAULT_PROMPT,
  temperature: 0,
  description: '',
}

const EMPTY_CUSTOM: CustomForm = {
  agentId: '',
  endpoint: '',
  description: '',
}

function normalizeId(v: string) {
  return v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')
}

interface TestResult {
  decision: 'approve' | 'reject'
  reason: string
}

export function RegisterAgentModal() {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<AgentMode>(null)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [showKey, setShowKey] = useState(false)

  const [hosted, setHosted] = useState<HostedForm>(EMPTY_HOSTED)
  const [custom, setCustom] = useState<CustomForm>(EMPTY_CUSTOM)

  function reset() {
    setMode(null)
    setHosted(EMPTY_HOSTED)
    setCustom(EMPTY_CUSTOM)
    setTestResult(null)
    setShowKey(false)
  }

  function handleClose(nextOpen: boolean) {
    setOpen(nextOpen)
    if (!nextOpen) reset()
  }

  async function testHostedAgent() {
    if (!hosted.apiKey || !hosted.systemPrompt) {
      toast.error('Enter an API key and system prompt first')
      return
    }

    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/agents/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: hosted.provider,
          apiKey: hosted.apiKey,
          model: hosted.model,
          systemPrompt: hosted.systemPrompt,
          temperature: hosted.temperature,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error('Test failed', { description: data.error ?? `HTTP ${res.status}` })
        return
      }

      setTestResult({ decision: data.decision, reason: data.reason })
    } catch {
      toast.error('Test failed', { description: 'Network error' })
    } finally {
      setTesting(false)
    }
  }

  async function handleSubmitHosted() {
    const agentId = hosted.agentId.trim()
    if (!agentId) { toast.error('Agent ID is required'); return }
    if (!hosted.apiKey) { toast.error('API key is required'); return }
    if (!hosted.systemPrompt) { toast.error('System prompt is required'); return }

    setSaving(true)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          type: 'hosted',
          provider: hosted.provider,
          apiKey: hosted.apiKey,
          model: hosted.model,
          systemPrompt: hosted.systemPrompt,
          temperature: hosted.temperature,
          description: hosted.description.trim() || `${hosted.provider} ${hosted.model} agent`,
        }),
      })

      const body = await res.json().catch(() => ({}))

      if (res.ok) {
        toast.success('Agent registered', {
          description: `${agentId} is now voting on your payments.`,
        })
        reset()
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

  async function handleSubmitCustom() {
    const agentId = custom.agentId.trim()
    const endpoint = custom.endpoint.trim()

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
          description: custom.description.trim() || undefined,
          type: 'custom',
        }),
      })

      const body = await res.json().catch(() => ({}))

      if (res.ok) {
        toast.success('Agent registered', {
          description: `${agentId} added to Soroban + Supabase.`,
        })
        reset()
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Add Agent
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        {/* ── Step 1: Choose mode ── */}
        {mode === null && (
          <>
            <DialogHeader>
              <DialogTitle>Add a consensus agent</DialogTitle>
              <DialogDescription>
                Choose how you want to add an agent that votes on your payments.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 py-4">
              <button
                type="button"
                onClick={() => setMode('hosted')}
                className="group flex flex-col items-center gap-3 p-6 rounded-lg border border-border bg-card hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-center"
              >
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">AI Agent</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                    Powered by OpenAI or Anthropic.<br />
                    Just paste an API key and write a prompt.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('custom')}
                className="group flex flex-col items-center gap-3 p-6 rounded-lg border border-border bg-card hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-center"
              >
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                  <Globe className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Custom Endpoint</p>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
                    Bring your own HTTP server.<br />
                    Full control over the voting logic.
                  </p>
                </div>
              </button>
            </div>
          </>
        )}

        {/* ── Step 2a: Hosted AI Agent ── */}
        {mode === 'hosted' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setMode(null); setTestResult(null) }}
                  className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <div>
                  <DialogTitle>AI Agent</DialogTitle>
                  <DialogDescription>
                    Configure an LLM-powered agent. ShieldPay hosts it for you.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-1">
              {/* Agent ID */}
              <div className="space-y-1.5">
                <Label htmlFor="h-agentId" className="text-xs">Agent ID</Label>
                <Input
                  id="h-agentId"
                  placeholder="my-compliance-agent"
                  value={hosted.agentId}
                  onChange={e => setHosted(p => ({ ...p, agentId: normalizeId(e.target.value) }))}
                  className="font-mono text-sm h-9"
                />
              </div>

              {/* Provider */}
              <div className="space-y-1.5">
                <Label className="text-xs">Provider</Label>
                <div className="flex gap-2">
                  {(['openai', 'anthropic'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setHosted(prev => ({
                        ...prev,
                        provider: p,
                        model: MODELS[p][0].id,
                      }))}
                      className={`flex-1 py-2 rounded-md text-xs font-medium border transition-colors ${
                        hosted.provider === p
                          ? p === 'openai'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                          : 'bg-transparent text-muted-foreground border-border hover:border-border/80'
                      }`}
                    >
                      {p === 'openai' ? 'OpenAI' : 'Anthropic'}
                    </button>
                  ))}
                </div>
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <Label htmlFor="h-apiKey" className="text-xs">API Key</Label>
                <div className="relative">
                  <Input
                    id="h-apiKey"
                    type={showKey ? 'text' : 'password'}
                    placeholder={hosted.provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
                    value={hosted.apiKey}
                    onChange={e => setHosted(p => ({ ...p, apiKey: e.target.value }))}
                    className="font-mono text-sm h-9 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Encrypted before storage. Only used at vote time.
                </p>
              </div>

              {/* Model */}
              <div className="space-y-1.5">
                <Label htmlFor="h-model" className="text-xs">Model</Label>
                <select
                  id="h-model"
                  value={hosted.model}
                  onChange={e => setHosted(p => ({ ...p, model: e.target.value }))}
                  className="w-full h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
                >
                  {MODELS[hosted.provider].map(m => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* System Prompt */}
              <div className="space-y-1.5">
                <Label htmlFor="h-prompt" className="text-xs">
                  System Prompt
                </Label>
                <textarea
                  id="h-prompt"
                  rows={5}
                  value={hosted.systemPrompt}
                  onChange={e => setHosted(p => ({ ...p, systemPrompt: e.target.value }))}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring resize-y min-h-[80px]"
                  placeholder="Describe what this agent should approve or reject..."
                />
                <p className="text-[10px] text-muted-foreground">
                  Tell the agent what to focus on. E.g. &quot;Reject gaming purchases. Only approve cloud and dev tools.&quot;
                </p>
              </div>

              {/* Temperature */}
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Temperature: {hosted.temperature.toFixed(1)}
                </Label>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={hosted.temperature}
                  onChange={e => setHosted(p => ({ ...p, temperature: Number(e.target.value) }))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Deterministic</span>
                  <span>Creative</span>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="h-desc" className="text-xs">
                  Description <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="h-desc"
                  placeholder="What does this agent focus on?"
                  value={hosted.description}
                  onChange={e => setHosted(p => ({ ...p, description: e.target.value }))}
                  className="text-sm h-9"
                />
              </div>

              {/* Test area */}
              <div className="border-t border-border pt-3 space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={testHostedAgent}
                  disabled={testing || !hosted.apiKey || !hosted.systemPrompt}
                  className="gap-1.5 text-xs w-full"
                >
                  {testing
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <FlaskConical className="h-3.5 w-3.5" />
                  }
                  {testing ? 'Testing...' : 'Test with sample payment'}
                </Button>

                {testResult && (
                  <div className={`rounded-md border p-3 text-xs space-y-1 ${
                    testResult.decision === 'approve'
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-red-500/5 border-red-500/20'
                  }`}>
                    <div className="flex items-center gap-1.5 font-medium">
                      {testResult.decision === 'approve'
                        ? <Check className="h-3.5 w-3.5 text-emerald-400" />
                        : <X className="h-3.5 w-3.5 text-red-400" />
                      }
                      <span className={testResult.decision === 'approve' ? 'text-emerald-400' : 'text-red-400'}>
                        {testResult.decision.toUpperCase()}
                      </span>
                      <span className="text-muted-foreground font-normal ml-1">
                        (sample: $25 USDC to aws-services)
                      </span>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      {testResult.reason}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => handleClose(false)} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmitHosted} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {saving ? 'Registering...' : 'Register Agent'}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step 2b: Custom Endpoint ── */}
        {mode === 'custom' && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMode(null)}
                  className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                </button>
                <div>
                  <DialogTitle>Custom Endpoint</DialogTitle>
                  <DialogDescription>
                    Point to your own HTTP server. It must accept POST with{' '}
                    <span className="font-mono">{'{ intent, context }'}</span> and return{' '}
                    <span className="font-mono">{'{ decision, reason }'}</span>.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-1">
              {/* Agent ID */}
              <div className="space-y-1.5">
                <Label htmlFor="c-agentId" className="text-xs">Agent ID</Label>
                <Input
                  id="c-agentId"
                  placeholder="my-agent"
                  value={custom.agentId}
                  onChange={e => setCustom(p => ({ ...p, agentId: normalizeId(e.target.value) }))}
                  className="font-mono text-sm h-9"
                />
                <p className="text-[10px] text-muted-foreground">
                  Lowercase, hyphens allowed. Used as the on-chain identifier.
                </p>
              </div>

              {/* Endpoint */}
              <div className="space-y-1.5">
                <Label htmlFor="c-endpoint" className="text-xs">Endpoint URL</Label>
                <Input
                  id="c-endpoint"
                  placeholder="https://my-agent.example.com/vote"
                  value={custom.endpoint}
                  onChange={e => setCustom(p => ({ ...p, endpoint: e.target.value }))}
                  className="font-mono text-sm h-9"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="c-desc" className="text-xs">
                  Description <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="c-desc"
                  placeholder="What does this agent evaluate?"
                  value={custom.description}
                  onChange={e => setCustom(p => ({ ...p, description: e.target.value }))}
                  className="text-sm h-9"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" size="sm" onClick={() => handleClose(false)} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmitCustom} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                {saving ? 'Registering...' : 'Register Agent'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
