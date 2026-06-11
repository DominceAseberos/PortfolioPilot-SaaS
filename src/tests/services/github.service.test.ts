import { GitHubService } from '@/features/github/services/github.service'

describe('GitHubService', () => {
  let service: GitHubService

  beforeEach(() => {
    service = new GitHubService()
  })

  describe('analyze', () => {
    it('should return analysis structure for a valid username', async () => {
      const result = await service.analyze('octocat')
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('strengths')
      expect(result).toHaveProperty('weaknesses')
      expect(result).toHaveProperty('recommendations')
      expect(Array.isArray(result.strengths)).toBe(true)
    })

    it('should handle non-existent usernames', async () => {
      const result = await service.analyze('this-user-does-not-exist-12345')
      expect(result.score).toBe(0)
      expect(result.weaknesses.length).toBeGreaterThanOrEqual(1)
    })
  })
})
