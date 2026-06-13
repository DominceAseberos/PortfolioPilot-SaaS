import { type NextRequest } from 'next/server'
import { resumeService } from '@/features/resume/services/resume.service'
import { successResponse, errorResponse } from '@/utils/api'
import { FILE_UPLOAD } from '@/constants'
import { createClient } from '@/lib/supabase/server'
import { creditRepository } from '@/features/credits/repositories/credit.repository'

import { getAnalysisCost } from '@/config/pricing'

const CREDIT_COST = getAnalysisCost('resume')

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse('Unauthorized. Please log in to run AI analysis.', 401)
    }

    const formData = await request.formData()
    const file = formData.get('resume') as File | null

    if (!file) {
      return errorResponse('No file uploaded', 400)
    }

    if (file.size > FILE_UPLOAD.maxFileSize) {
      return errorResponse('File size must be less than 5MB', 400)
    }

    if (file.type !== 'application/pdf') {
      return errorResponse('File must be a PDF', 400)
    }

    const credits = await creditRepository.getUserCredits(user.id)
    if (credits < CREDIT_COST) {
      return errorResponse(`Insufficient credits. You need ${CREDIT_COST} credits to analyze a resume.`, 402)
    }

    const deducted = await creditRepository.deductCredits(user.id, CREDIT_COST)
    if (!deducted) {
      return errorResponse('Failed to deduct credits. Please try again.', 500)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await resumeService.analyze(buffer, file.name)
    return successResponse(result, 'Resume analysis complete')
  } catch {
    return errorResponse('Resume analysis failed', 500)
  }
}
