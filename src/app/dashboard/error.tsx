'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Dashboard route error', { message: error.message, digest: error.digest })
  }, [error])

  return (
    <div className="h-full min-h-[60vh] flex items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-7 shadow-lg" role="alert">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <h1 className="font-bold">The dashboard could not finish rendering</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Retry this view. Existing analysis history and local resume drafts remain intact.
            </p>
          </div>
        </div>
        <Button type="button" className="mt-5" onClick={reset}>
          <RefreshCw className="mr-2 h-4 w-4" /> Retry dashboard
        </Button>
      </section>
    </div>
  )
}
