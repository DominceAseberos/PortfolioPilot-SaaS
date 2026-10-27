import { type NextRequest, NextResponse } from 'next/server'
import { creditRepository } from '@/features/credits/repositories/credit.repository'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const webhookSecret =
      process.env.POLAR_WEBHOOK_SECRET ||
      'whsec_7ZTyC8YzfCW2pu7DS5E5ky4jIFEO3kJpkUWUaFKuq1Y='

    // Optional webhook signature verification
    if (webhookSecret) {
      const webhookId = request.headers.get('webhook-id')
      const webhookTimestamp = request.headers.get('webhook-timestamp')
      const webhookSignature = request.headers.get('webhook-signature')

      if (webhookSignature && webhookTimestamp && webhookId) {
        const toSign = `${webhookId}.${webhookTimestamp}.${rawBody}`
        const secretBytes = webhookSecret.startsWith('whsec_')
          ? Buffer.from(webhookSecret.replace('whsec_', ''), 'base64')
          : Buffer.from(webhookSecret, 'utf-8')

        const expectedSignature = crypto
          .createHmac('sha256', secretBytes)
          .update(toSign)
          .digest('base64')

        const signatures = webhookSignature.split(' ').map((s) => s.split(',')[1] || s)
        const isValid = signatures.some(
          (s) => s === expectedSignature || s === `v1,${expectedSignature}`
        )
        if (!isValid) {
          logger.warn('Polar webhook signature verification warning')
        }
      }
    }

    const payload = JSON.parse(rawBody)
    const eventType = payload.type || payload.event

    logger.info('Received Polar webhook', { type: eventType })

    // Polar triggers order.created upon completed checkout
    if (eventType === 'order.created' || eventType === 'checkout.updated') {
      const data = payload.data || {}
      const status = data.status
      if (eventType === 'checkout.updated' && status !== 'succeeded' && status !== 'confirmed') {
        return NextResponse.json({ received: true, ignored: true }, { status: 200 })
      }

      const metadata = data.metadata || data.checkout?.metadata || {}
      const userId = metadata.user_id
      const creditsToAdd = Number(metadata.credits) || 20

      if (userId) {
        await creditRepository.addCreditsAdmin(userId, creditsToAdd)
        logger.info(`Polar: successfully credited ${creditsToAdd} credits to user ${userId}`)
      } else {
        logger.warn('Polar webhook payload had no user_id in metadata', { data })
      }
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Polar webhook error'
    logger.error('Polar webhook exception', { error: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
