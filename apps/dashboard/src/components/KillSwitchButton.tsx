'use client'

import { useState, useEffect } from 'react'
import { Zap, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initialSessionCount: number
}

export function KillSwitchButton({ initialSessionCount }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionCount, setSessionCount] = useState(initialSessionCount)

  useEffect(() => {
    const supabase = createClient()

    const refreshCount = () => {
      supabase
        .from('mpp_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .then(({ count }) => setSessionCount(count ?? 0))
    }

    const channel = supabase
      .channel('kill-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mpp_sessions' }, refreshCount)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function handleKill() {
    setLoading(true)
    try {
      const res = await fetch('/api/kill', { method: 'POST' })
      if (res.ok) {
        toast.success('Kill switch activated', {
          description: `${sessionCount} MPP session${sessionCount !== 1 ? 's' : ''} terminated.`,
        })
        setOpen(false)
      } else {
        const body = await res.json().catch(() => ({}))
        toast.error('Kill failed', {
          description: body.error ?? 'Unexpected error from ShieldPay.',
        })
      }
    } catch {
      toast.error('Kill failed', {
        description: 'Network error — is ShieldPay running on port 4000?',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-1.5 text-xs">
          <Zap className="h-3.5 w-3.5" />
          Kill All Sessions
          {sessionCount > 0 && (
            <span className="ml-0.5 font-mono text-[10px] bg-red-900/50 px-1.5 py-0.5 rounded">
              {sessionCount}
            </span>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Kill all MPP sessions?
          </DialogTitle>
          <DialogDescription className="pt-1">
            This will immediately terminate{' '}
            <span className="font-semibold text-foreground">{sessionCount}</span> active
            MPP session{sessionCount !== 1 ? 's' : ''}. Any charges in progress will be
            halted. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleKill}
            disabled={loading}
          >
            {loading ? 'Terminating…' : 'Kill all sessions'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
