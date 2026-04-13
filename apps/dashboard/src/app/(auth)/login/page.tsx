'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Mail, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    setLoading(false)

    if (error) {
      toast.error('Could not send login link', { description: error.message })
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
          <Mail className="h-6 w-6 text-emerald-700" />
        </div>
        <h1 className="text-lg font-semibold text-zinc-900">Check your email</h1>
        <p className="mt-2 text-sm text-zinc-500">
          We sent a magic link to <strong>{email}</strong>. Click it to sign in.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="mt-6 text-zinc-500"
          onClick={() => setSent(false)}
        >
          Use a different email
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border bg-white p-8 shadow-sm">
      <h1 className="text-lg font-semibold text-zinc-900">Sign in to Sentinel</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Enter your email — we'll send you a magic link.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
        </div>

        <Button type="submit" className="w-full bg-emerald-950 hover:bg-emerald-900" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending…
            </>
          ) : (
            'Send magic link'
          )}
        </Button>
      </form>
    </div>
  )
}
