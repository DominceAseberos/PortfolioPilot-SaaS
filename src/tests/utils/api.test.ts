import { successResponse, errorResponse } from '@/utils/api'

describe('API utilities', () => {
  describe('successResponse', () => {
    it('should return a success response with data', async () => {
      const response = successResponse({ id: 1 }, 'Success')
      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.message).toBe('Success')
      expect(body.data).toEqual({ id: 1 })
    })
  })

  describe('errorResponse', () => {
    it('should return an error response', async () => {
      const response = errorResponse('Something went wrong', 400)
      const body = await response.json()
      expect(body.success).toBe(false)
      expect(body.message).toBe('Something went wrong')
      expect(response.status).toBe(400)
    })

    it('should include errors array when provided', async () => {
      const response = errorResponse('Validation failed', 400, ['Invalid email', 'Password too short'])
      const body = await response.json()
      expect(body.errors).toEqual(['Invalid email', 'Password too short'])
    })
  })
})
