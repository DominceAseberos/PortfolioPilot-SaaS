'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Application route error', { message: error.message, digest: error.digest })
  }, [error])

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-7 shadow-xl" role="alert">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-destructive/10 p-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold">PortfolioPilot hit an unexpected error</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              The current page can be retried safely. Your saved reviews and browser resume drafts are not deleted by this recovery screen.
            </p>
          </div>
        </div>
        <Button type="button" className="mt-5" onClick={reset}>
          <RefreshCw className="mr-2 h-4 w-4" /> Try again
        </Button>
      </section>
    </main>
  )
}
