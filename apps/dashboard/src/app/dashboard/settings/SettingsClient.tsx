'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Copy, CheckCircle2, Trash2, Plus, Terminal, Key, User } from 'lucide-react'

interface ApiKey {
  id: string
  prefix: string
  label: string
  created_at: string
}

interface Props {
  ownerId: string
}

export function SettingsClient({ ownerId }: Props) {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [newKeyLabel, setNewKeyLabel] = useState('')
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [newKeyCopied, setNewKeyCopied] = useState(false)
  const [mcpCopied, setMcpCopied] = useState(false)
  const [ownerCopied, setOwnerCopied] = useState(false)

  useEffect(() => {
    fetchKeys()
  }, [])

  async function fetchKeys() {
    const res = await fetch('/api/me/api-keys')
    if (res.ok) {
      const data = await res.json()
      setKeys(data.keys ?? [])
    }
  }

  async function createKey() {
    setCreating(true)
    try {
      const res = await fetch('/api/me/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newKeyLabel || 'API key' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNewKey(data.key)
      setNewKeyLabel('')
      fetchKeys()
    } catch (err) {
      toast.error('Failed to create key', { description: (err as Error).message })
    } finally {
      setCreating(false)
    }
  }

  async function revokeKey(id: string) {
    const res = await fetch(`/api/me/api-keys/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setKeys(prev => prev.filter(k => k.id !== id))
      toast.success('Key revoked')
    } else {
      toast.error('Failed to revoke key')
    }
  }

  function copy(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  const mcpCommand = newKey
    ? `claude mcp add shieldpay -- npx @oppialabs/sentinel-mcp -e SENTINEL_API_KEY=${newKey}`
    : ''

  return (
    <div className="p-6 space-y-8 max-w-2xl">
      {/* Agent Identity */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
          <User className="h-4 w-4 text-emerald-700" />
          Agent identity
        </div>
        <div className="rounded-xl border bg-white p-4 space-y-2">
          <p className="text-xs text-zinc-400 uppercase tracking-wider font-medium">Owner ID (Stellar public key)</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-zinc-700 break-all bg-zinc-50 rounded-lg px-3 py-2 border">
              {ownerId}
            </code>
            <button
              onClick={() => copy(ownerId, setOwnerCopied)}
              className="shrink-0 text-zinc-400 hover:text-zinc-700"
              title="Copy owner ID"
            >
              {ownerCopied
                ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-zinc-400">
            This is your agent's on-chain identity. Policies, agents, and transactions are scoped to this address.
          </p>
        </div>
      </section>

      {/* New key shown once */}
      {newKey && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
            <Key className="h-4 w-4" />
            New API key — save it now
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-white border border-emerald-200 px-3 py-2.5">
            <code className="flex-1 text-xs font-mono text-zinc-800 break-all">{newKey}</code>
            <button
              onClick={() => copy(newKey, setNewKeyCopied)}
              className="shrink-0 text-emerald-600 hover:text-emerald-800"
            >
              {newKeyCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-medium text-emerald-800">
              <Terminal className="h-4 w-4" />
              Add to Claude Code
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-zinc-950 px-3 py-3">
              <code className="flex-1 text-xs font-mono text-emerald-400 break-all">{mcpCommand}</code>
              <button
                onClick={() => copy(mcpCommand, setMcpCopied)}
                className="shrink-0 text-zinc-400 hover:text-zinc-200 mt-0.5"
              >
                {mcpCopied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="text-emerald-700 hover:text-emerald-900"
            onClick={() => setNewKey(null)}
          >
            Dismiss
          </Button>
        </section>
      )}

      {/* API Keys */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
          <Key className="h-4 w-4 text-emerald-700" />
          API keys
        </div>

        <div className="rounded-xl border bg-white divide-y">
          {keys.length === 0 && (
            <p className="px-4 py-6 text-sm text-center text-zinc-400">No API keys yet.</p>
          )}
          {keys.map(k => (
            <div key={k.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium text-zinc-800">{k.label}</p>
                <p className="text-xs font-mono text-zinc-400">{k.prefix}…</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs text-zinc-400">
                  {new Date(k.created_at).toLocaleDateString()}
                </p>
                <button
                  onClick={() => revokeKey(k.id)}
                  className="text-zinc-300 hover:text-red-500 transition-colors"
                  title="Revoke"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Key label (optional)"
            value={newKeyLabel}
            onChange={(e) => setNewKeyLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createKey()}
            className="max-w-xs"
          />
          <Button
            onClick={createKey}
            disabled={creating}
            className="gap-1.5 bg-emerald-950 hover:bg-emerald-900"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Create key
          </Button>
        </div>
        <p className="text-xs text-zinc-400">
          Raw key shown once on creation. Use it in your MCP config or any HTTP client.
        </p>
      </section>
    </div>
  )
}
