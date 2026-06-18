'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

/**
 * Fetches and subscribes to real-time credit balance for a user.
 *
 * Works for both anonymous users (is_anonymous = true) and fully
 * authenticated users — both have a real UUID in auth.users.
 *
 * If userId is undefined (session not yet bootstrapped), returns null
 * and re-runs automatically once the auth state change fires.
 */
export function useCredits(userId: string | undefined) {
  const [credits, setCredits] = useState<number | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const fetchCredits = async (uid: string) => {
      const { data } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('user_id', uid)
        .single()

      setCredits(data?.credits ?? 0)
    }

    // If we already have a userId (anonymous or real), fetch immediately
    if (userId) {
      fetchCredits(userId)
    }

    // Subscribe to auth state changes so we pick up the anonymous session
    // the moment GuestSessionProvider creates it on first visit
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const uid = session?.user?.id
      if (uid) {
        fetchCredits(uid)
      } else {
        setCredits(null)
      }
    })

    // Real-time subscription for credit deductions
    const channel = supabase
      .channel(`user-credits-${userId ?? 'pending'}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_credits',
          filter: userId ? `user_id=eq.${userId}` : undefined,
        },
        (payload) => {
          if (payload.new && typeof payload.new.credits === 'number') {
            setCredits(payload.new.credits)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
      supabase.removeChannel(channel)
    }
  }, [userId])

  return credits
}
