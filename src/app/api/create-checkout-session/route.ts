import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paymentService } from '@/features/payments/services/payment.service'
import { successResponse, errorResponse, unauthorizedResponse } from '@/utils/api'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return unauthorizedResponse()

    const body = await request.json()
    const { priceId } = body

    if (!priceId) {
      return errorResponse('Price ID is required', 400)
    }

    const session = await paymentService.createCheckoutSession(user.id, priceId, user.email!)

    return successResponse({ url: session.url }, 'Checkout session created')
  } catch (error) {
    console.error('Checkout Session Error:', error)
    return errorResponse('Failed to create checkout session', 500)
  }
}
