import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const timestamp = new Date().toISOString()
  try {
    const supabase = createAdminClient()

    // Execute a lightweight database count query to refresh Supabase activity
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.warn('Keep-alive database warning:', error.message)
      return NextResponse.json(
        {
          status: 'ok',
          message: 'Pinged with fallback',
          detail: error.message,
          timestamp,
        },
        { status: 200 }
      )
    }

    return NextResponse.json(
      {
        status: 'ok',
        message: 'Supabase project is awake and active',
        timestamp,
        profilesCount: count,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Keep-alive ping error:', err)
    return NextResponse.json(
      {
        status: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
        timestamp,
      },
      { status: 500 }
    )
  }
}
