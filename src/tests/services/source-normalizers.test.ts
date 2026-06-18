import {
  isValidGitHubUsername,
  normalizeGitHubUsername,
  normalizePortfolioUrl,
} from '@/utils/source-normalizers'

describe('source normalizers', () => {
  it('normalizes GitHub profile URLs to usernames', () => {
    expect(normalizeGitHubUsername('https://github.com/octocat/project.')).toBe('octocat')
  })

  it('validates GitHub username rules', () => {
    expect(isValidGitHubUsername('octo-cat')).toBe(true)
    expect(isValidGitHubUsername('-octocat')).toBe(false)
    expect(isValidGitHubUsername('octocat-')).toBe(false)
  })

  it('normalizes portfolio URLs with protocol', () => {
    expect(normalizePortfolioUrl('example.dev')).toBe('https://example.dev')
  })
})
