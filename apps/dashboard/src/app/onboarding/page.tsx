'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Copy, CheckCircle2, AlertTriangle, Loader2, Key, Terminal, CircleDot } from 'lucide-react'

const HORIZON_TESTNET   = 'https://horizon-testnet.stellar.org'
const FRIENDBOT_URL     = 'https://friendbot.stellar.org'
const USDC_ISSUER       = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015'

interface Keypair {
  publicKey: string
  secretKey: string
}

type SetupStep =
  | { id: 'friendbot'; label: 'Funding with XLM' }
  | { id: 'trustline'; label: 'Creating USDC trustline' }
  | { id: 'governance'; label: 'Registering governance agents' }
  | { id: 'apikey'; label: 'Generating API key' }

const SETUP_STEPS: SetupStep[] = [
  { id: 'friendbot',  label: 'Funding with XLM' },
  { id: 'trustline',  label: 'Creating USDC trustline' },
  { id: 'governance', label: 'Registering governance agents' },
  { id: 'apikey',     label: 'Generating API key' },
]

export default function OnboardingPage() {
  const router = useRouter()

  const [keypair, setKeypair]           = useState<Keypair | null>(null)
  const [apiKey, setApiKey]             = useState<string | null>(null)
  const [secretCopied, setSecretCopied] = useState(false)
  const [apiKeyCopied, setApiKeyCopied] = useState(false)
  const [mcpCopied, setMcpCopied]       = useState(false)
  const [confirmed, setConfirmed]       = useState(false)
  const [saving, setSaving]             = useState(false)
  const [currentStep, setCurrentStep]   = useState<string | null>(null)
  const [doneSteps, setDoneSteps]       = useState<string[]>([])
  const [page, setPage]                 = useState<'generating' | 'save-secret' | 'funding' | 'done'>('generating')

  useEffect(() => {
    async function generate() {
      const { Keypair } = await import('@stellar/stellar-sdk')
      const kp = Keypair.random()
      setKeypair({ publicKey: kp.publicKey(), secretKey: kp.secret() })
      setPage('save-secret')
    }
    generate()
  }, [])

  async function handleSaveAndContinue() {
    if (!keypair || !confirmed) return
    setSaving(true)
    setPage('funding')

    const markDone = (id: string) => setDoneSteps(prev => [...prev, id])

    try {
      // ── Step 1: Friendbot (fund with 10,000 XLM) ───────────────────────────
      setCurrentStep('friendbot')
      const fbRes = await fetch(`${FRIENDBOT_URL}?addr=${keypair.publicKey}`)
      if (!fbRes.ok) {
        const fbBody = await fbRes.text()
        // Friendbot returns 400 if already funded — that's fine
        if (!fbBody.includes('already') && !fbBody.includes('createAccountAlreadyExist')) {
          throw new Error(`Friendbot failed: ${fbBody.slice(0, 120)}`)
        }
      }

      // ── Poll Horizon until account exists ─────────────────────────────────
      for (let i = 0; i < 20; i++) {
        try {
          const acctRes = await fetch(`${HORIZON_TESTNET}/accounts/${keypair.publicKey}`)
          if (acctRes.ok) break
        } catch { /* keep polling */ }
        await new Promise(r => setTimeout(r, 3000))
      }
      markDone('friendbot')

      // ── Step 2: USDC trustline ─────────────────────────────────────────────
      setCurrentStep('trustline')
      const {
        Keypair: StellarKeypair,
        Networks,
        TransactionBuilder,
        Operation,
        Asset,
        BASE_FEE,
        Horizon,
      } = await import('@stellar/stellar-sdk')

      const horizon = new Horizon.Server(HORIZON_TESTNET)
      const account = await horizon.loadAccount(keypair.publicKey)
      const USDC    = new Asset('USDC', USDC_ISSUER)

      const trustTx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(Operation.changeTrust({ asset: USDC }))
        .setTimeout(30)
        .build()

      const kp = StellarKeypair.fromSecret(keypair.secretKey)
      trustTx.sign(kp)
      await horizon.submitTransaction(trustTx)
      markDone('trustline')

      // ── Step 3: Create profile → triggers USDC funding + Soroban setup ────
      setCurrentStep('governance')
      const profileRes = await fetch('/api/me/profile', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ownerId: keypair.publicKey }),
      })

      if (!profileRes.ok) {
        const body = await profileRes.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to create profile')
      }
      markDone('governance')

      // ── Step 4: Generate API key ────────────────────────────────────────────
      setCurrentStep('apikey')
      const keyRes = await fetch('/api/me/api-keys', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ label: 'Default key' }),
      })

      if (!keyRes.ok) {
        const body = await keyRes.json().catch(() => ({}))
        throw new Error(body.error ?? 'Failed to create API key')
      }

      const { key } = await keyRes.json()
      markDone('apikey')
      setApiKey(key)
      setPage('done')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error('Setup failed', { description: msg })
      setPage('save-secret')
      setSaving(false)
      setCurrentStep(null)
      setDoneSteps([])
    }
  }

  function copy(text: string, setter: (v: boolean) => void) {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  const mcpCommand = apiKey
    ? `claude mcp add shieldpay -- npx @oppialabs/sentinel-mcp -e SENTINEL_API_KEY=${apiKey}`
    : ''

  // ── Generating ──────────────────────────────────────────────────────────────
  if (page === 'generating') {
    return (
      <div
        className="flex min-h-screen items-center justify-center inset-0 bg-center bg-cover"
        style={{ backgroundImage: "url('/hero/hero2.jpeg')", filter: 'brightness(0.8)' }}
      >
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-white" />
          <p className="mt-3 text-sm text-white/80">Generating your keypair…</p>
        </div>
      </div>
    )
  }

  // ── Save secret key ─────────────────────────────────────────────────────────
  if (page === 'save-secret' && keypair) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-4 inset-0 bg-center bg-cover"
        style={{ backgroundImage: "url('/hero/hero2.jpeg')", filter: 'brightness(0.8)' }}
      >
        <div className="w-full max-w-lg rounded-2xl border bg-white p-8 shadow-sm space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Save your secret key</h1>
            <p className="mt-1 text-sm text-zinc-500">
              We generated a Stellar keypair for your agent identity. Save the secret key now — it
              won't be shown again.
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Public key (your agent ID)</p>
              <div className="flex items-center gap-2 rounded-lg bg-zinc-50 border px-3 py-2.5">
                <code className="flex-1 text-xs font-mono text-zinc-700 break-all">{keypair.publicKey}</code>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">Secret key — save this!</p>
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                <code className="flex-1 text-xs font-mono text-amber-900 break-all">{keypair.secretKey}</code>
                <button
                  onClick={() => copy(keypair.secretKey, setSecretCopied)}
                  className="shrink-0 text-amber-600 hover:text-amber-800"
                  title="Copy secret key"
                >
                  {secretCopied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-sm text-amber-800">
              Copy and store your secret key somewhere safe. It's not needed for everyday use, but it
              proves ownership of your agent identity on the Stellar blockchain.
            </p>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 accent-emerald-700"
            />
            <span className="text-sm text-zinc-700">I've copied and saved my secret key</span>
          </label>

          <Button
            onClick={handleSaveAndContinue}
            disabled={!confirmed || saving}
            className="w-full bg-emerald-950 hover:bg-emerald-900"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up…
              </>
            ) : (
              'Continue to setup'
            )}
          </Button>
        </div>
      </div>
    )
  }

  // ── Funding / progress screen ───────────────────────────────────────────────
  if (page === 'funding') {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-4 inset-0 bg-center bg-cover"
        style={{ backgroundImage: "url('/hero/hero2.jpeg')", filter: 'brightness(0.8)' }}
      >
        <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Setting up your account</h1>
            <p className="mt-1 text-sm text-zinc-500">
              This takes about 30 seconds. Don't close this tab.
            </p>
          </div>

          <div className="space-y-3">
            {SETUP_STEPS.map(step => {
              const done    = doneSteps.includes(step.id)
              const active  = currentStep === step.id
              const pending = !done && !active
              return (
                <div key={step.id} className="flex items-center gap-3">
                  <div className="shrink-0">
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : active ? (
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-700" />
                    ) : (
                      <CircleDot className="h-5 w-5 text-zinc-300" />
                    )}
                  </div>
                  <span className={
                    done    ? 'text-sm text-zinc-700 font-medium' :
                    active  ? 'text-sm text-zinc-900 font-semibold' :
                              'text-sm text-zinc-400'
                  }>
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>

          <p className="text-xs text-zinc-400">
            Your account is being funded with 10,000 XLM and 100 USDC on Stellar testnet, and
            the three governance agents (risk, cost, logic) are being registered on-chain.
          </p>
        </div>
      </div>
    )
  }

  // ── Done ────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 inset-0 bg-cover bg-center"
      style={{ backgroundImage: "url('/hero/hero2.jpeg')", filter: 'brightness(0.8)' }}
    >
      <div className="w-full max-w-lg rounded-2xl border bg-white p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">You're all set!</h1>
            <p className="text-sm text-zinc-500">Connect your MCP in one command.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <Key className="h-4 w-4 text-emerald-700" />
              Your API key
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-zinc-50 border px-3 py-2.5">
              <code className="flex-1 text-xs font-mono text-zinc-700 break-all">{apiKey}</code>
              <button
                onClick={() => copy(apiKey!, setApiKeyCopied)}
                className="shrink-0 text-zinc-400 hover:text-zinc-700"
              >
                {apiKeyCopied ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-zinc-400">This key won't be shown again. Generate new ones in Settings.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <Terminal className="h-4 w-4 text-emerald-700" />
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
            <p className="text-xs text-zinc-400">
              Run this in your terminal. Claude will use Sentinel to govern every payment.
            </p>
          </div>
        </div>

        <Button
          onClick={() => router.push('/dashboard')}
          className="w-full bg-emerald-950 hover:bg-emerald-900"
        >
          Open dashboard
        </Button>
      </div>
    </div>
  )
}
