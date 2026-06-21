'use client'

import { useState } from 'react'
import { Button } from '@/components/common/Button'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { UserIdentity } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface DisconnectProviderButtonProps {
  identity: UserIdentity
  disabled: boolean
}

export function DisconnectProviderButton({ identity, disabled }: DisconnectProviderButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleDisconnect = async () => {
    if (disabled) {
      toast.error('You cannot disconnect your only login method.')
      return
    }
    
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.unlinkIdentity(identity)
      if (error) throw error
      
      toast.success(`Successfully disconnected ${identity.provider}`)
      router.refresh()
    } catch (error: unknown) {
      console.error(`Failed to disconnect ${identity.provider}:`, error)
      const errorMsg = error instanceof Error ? error.message : String(error)
      toast.error(`Failed to disconnect ${identity.provider}: ${errorMsg}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button 
      variant="ghost" 
      size="sm"
      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 ml-2 px-3 h-8"
      onClick={handleDisconnect}
      disabled={isLoading || disabled}
      title={disabled ? "Cannot disconnect your only login method" : `Disconnect ${identity.provider}`}
    >
      {isLoading ? 'Disconnecting...' : 'Disconnect'}
    </Button>
  )
}
