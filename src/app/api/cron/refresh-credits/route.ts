import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { WEEKLY_REFRESH_CREDITS, MAX_FREE_CREDITS } from '@/config/pricing'
import { logger } from '@/lib/logger'

/**
 * GET /api/cron/refresh-credits
 *
 * Called weekly by Vercel Cron (see vercel.json).
 * Tops up credits for all verified (non-anonymous) free-tier users,
 * without exceeding MAX_FREE_CREDITS.
 *
 * Protected by CRON_SECRET to prevent unauthorized calls.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`

  if (!process.env.CRON_SECRET || authHeader !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createAdminClient()

    // Top up credits for all verified (non-anonymous) users,
    // capped at MAX_FREE_CREDITS to prevent hoarding.
    const { data, error } = await supabase.rpc('weekly_credit_refresh', {
      p_top_up: WEEKLY_REFRESH_CREDITS,
      p_max_credits: MAX_FREE_CREDITS,
    })

    if (error) {
      logger.error('Weekly credit refresh failed', { error: error.message })
      return NextResponse.json({ error: 'Database error during refresh' }, { status: 500 })
    }

    logger.info('Weekly credit refresh completed', { usersRefreshed: data })
    return NextResponse.json({
      success: true,
      usersRefreshed: data,
      topUp: WEEKLY_REFRESH_CREDITS,
      maxCredits: MAX_FREE_CREDITS,
    })
  } catch (error) {
    logger.error('Weekly credit refresh exception', { error: String(error) })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
