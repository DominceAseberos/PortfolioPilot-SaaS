'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function useCredits(userId: string | undefined) {
  const [credits, setCredits] = useState<number | null>(null)
  
  useEffect(() => {
    if (!userId) {
      setCredits(null)
      return
    }

    const supabase = createClient()

    const fetchCredits = async () => {
      const { data } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('user_id', userId)
        .single()
      
      setCredits(data?.credits ?? 0)
    }

    fetchCredits()

    const channel = supabase
      .channel('user-credits-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_credits',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new.credits === 'number') {
            setCredits(payload.new.credits)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  return credits
}
