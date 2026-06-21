import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { urlValidationService } from '@/features/reviews/services/validation.service'

/**
 * POST /api/reviews/validate-portfolio
 * 
 * Layer 1 Validation Route.
 * Handles authentication and HTTP lifecycle, but delegates validation logic
 * to the ValidationService (Single Responsibility Principle).
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    // Validation is allowed for guests, so we don't return 401 if !session
    const { portfolioUrl } = await req.json()

    if (!portfolioUrl) {
      return NextResponse.json(
        { success: false, message: 'Portfolio URL is required' },
        { status: 400 }
      )
    }

    // Delegate business logic to the service
    const validationResult = await urlValidationService.validatePortfolioUrl(portfolioUrl);

    if (!validationResult.isValid) {
      return NextResponse.json({
        success: false,
        message: validationResult.message
      })
    }

    return NextResponse.json({
      success: true,
      data: { 
        valid: true, 
        isClientRendered: validationResult.isClientRendered 
      }
    })

  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, message: 'An unexpected server error occurred during validation.' },
      { status: 500 }
    )
  }
}
