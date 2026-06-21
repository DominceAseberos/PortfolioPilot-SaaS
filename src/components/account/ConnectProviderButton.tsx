'use client'

import { useState } from 'react'
import { Button } from '@/components/common/Button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Provider } from '@supabase/supabase-js'

interface ConnectProviderButtonProps {
  provider: Provider
  label: string
}

export function ConnectProviderButton({ provider, label }: ConnectProviderButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleConnect = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/account/accounts`
        }
      })
      if (error) throw error
      // The page will redirect to the provider's OAuth flow, so we don't necessarily need to reset isLoading
      // But if it fails to redirect, we'd want to reset it.
    } catch (error: unknown) {
      console.error(`Failed to connect ${provider}:`, error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      toast.error(`Failed to connect ${provider}: ${errorMsg}`)
      setIsLoading(false)
    }
  }

  return (
    <Button 
      variant="outline" 
      className="rounded-xl font-bold shadow-sm shrink-0"
      onClick={handleConnect}
      disabled={isLoading}
    >
      {isLoading ? 'Connecting...' : label}
    </Button>
  )
}
