import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/types'

export function successResponse<T>(data: T, message = 'Success') {
  return NextResponse.json<ApiResponse<T>>({
    success: true,
    message,
    data,
  })
}

export function errorResponse(message: string, status = 400, errors?: string[], code?: string) {
  return NextResponse.json<ApiResponse>(
    { success: false, message, code, errors },
    { status }
  )
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return errorResponse(message, 401)
}

export function notFoundResponse(message = 'Resource not found') {
  return errorResponse(message, 404)
}

export function rateLimitResponse() {
  return errorResponse('Too many requests. Please try again later.', 429)
}

export function serverErrorResponse(error: unknown) {
  console.error('Internal server error:', error)
  return errorResponse('An unexpected error occurred', 500)
}
