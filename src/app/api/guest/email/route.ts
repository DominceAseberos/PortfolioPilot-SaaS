import { NextRequest } from 'next/server'
import { successResponse, errorResponse, serverErrorResponse } from '@/utils/api'
import { createClient } from '@supabase/supabase-js'

// Max free scans per unique email address
const MAX_GUEST_SCANS = 3

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body as { email?: string }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return errorResponse('Please provide a valid email address.', 400)
    }

    const normalizedEmail = email.trim().toLowerCase()
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // Check if this email already exists
    const { data: existing } = await supabaseAdmin
      .from('guest_emails')
      .select('id, scan_count')
      .eq('email', normalizedEmail)
      .single()

    if (existing) {
      if (existing.scan_count >= MAX_GUEST_SCANS) {
        return errorResponse(
          `You've used all ${MAX_GUEST_SCANS} free scans for this email. Create a free account to continue.`,
          429
        )
      }

      // Increment scan count
      await supabaseAdmin
        .from('guest_emails')
        .update({
          scan_count: existing.scan_count + 1,
          last_seen_at: new Date().toISOString(),
          ip_address: ipAddress,
        })
        .eq('id', existing.id)

      return successResponse(
        { scansRemaining: MAX_GUEST_SCANS - existing.scan_count - 1 },
        'Email verified'
      )
    }

    // New email — create record
    await supabaseAdmin.from('guest_emails').insert({
      email: normalizedEmail,
      ip_address: ipAddress,
      scan_count: 1,
    })

    return successResponse(
      { scansRemaining: MAX_GUEST_SCANS - 1 },
      'Email captured successfully'
    )
  } catch (error) {
    return serverErrorResponse(error)
  }
}
