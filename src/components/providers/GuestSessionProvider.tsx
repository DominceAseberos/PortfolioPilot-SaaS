'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * Bootstraps a Supabase anonymous session for first-time visitors.
 *
 * - If the user already has a session (anonymous OR real), does nothing.
 * - If no session exists, calls signInAnonymously() which:
 *   1. Creates a real UUID in auth.users (is_anonymous = true)
 *   2. Triggers the handle_new_user DB function → inserts 3 credits
 *   3. Stores the JWT in localStorage (auto-refreshed by Supabase)
 *
 * Session survives page refreshes, tab closes, and multi-hour gaps.
 * When the user signs up / logs in, Supabase upgrades the anonymous
 * user in-place — same UUID, so all credits and reviews carry over.
 */
export function GuestSessionProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const supabase = createClient()

    const bootstrap = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        await supabase.auth.signInAnonymously()
      }
    }

    bootstrap()
  }, [])

  return <>{children}</>
}
