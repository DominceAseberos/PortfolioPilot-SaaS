import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { ROUTES } from '@/constants'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? ROUTES.dashboard

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              response.cookies.set(name, value)
            )
          },
        },
      }
    )

    const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Merge guest session reviews if applicable
      const guestId = request.cookies.get('portfolio_guest_id')?.value
      if (guestId && sessionData.user?.id) {
        const supabaseAdmin = createSupabaseClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        await supabaseAdmin
          .from('reviews')
          .update({ user_id: sessionData.user.id })
          .eq('user_id', guestId)
          
        response.cookies.delete('portfolio_guest_id')
      }
      
      const hasUsername = !!sessionData.user?.user_metadata?.username
      
      if (!hasUsername && next.includes('/dashboard')) {
        const onboardingResponse = NextResponse.redirect(`${origin}/onboarding`)
        // Copy cookies set by exchangeCodeForSession to the new response
        response.cookies.getAll().forEach(c => onboardingResponse.cookies.set(c.name, c.value))
        return onboardingResponse
      }
      
      return response
    }
  }

  return NextResponse.redirect(`${origin}${ROUTES.login}?error=auth_failed`)
}
