import { type NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse } from '@/utils/api'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse('Must be logged in to merge sessions', 401)
    }

    const cookieStore = cookies()
    const guestId = cookieStore.get('portfolio_guest_id')?.value

    if (guestId) {
      // Update all reviews belonging to guestId to the real user's ID
      const { error } = await supabase
        .from('reviews')
        .update({ user_id: user.id })
        .eq('user_id', guestId)

      if (error) {
        console.error('Failed to merge reviews:', error)
        throw error
      }

      // Clear the cookie now that we've merged
      cookieStore.delete('portfolio_guest_id')
      
      return successResponse({ merged: true, guestId }, 'Merge successful')
    }

    return successResponse({ merged: false }, 'No guest session to merge')
  } catch (error) {
    return errorResponse('Merge failed', 500)
  }
}
