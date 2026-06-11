import type { GitHubAnalysis } from '@/types'
import { logger } from '@/lib/logger'

export class GitHubService {
  async analyze(username: string): Promise<GitHubAnalysis> {
    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
      }
      if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
      }

      const [userRes, reposRes] = await Promise.all([
        fetch(`https://api.github.com/users/${username}`, { headers, signal: AbortSignal.timeout(10000) }),
        fetch(`https://api.github.com/users/${username}/repos?per_page=30&sort=updated`, { headers, signal: AbortSignal.timeout(10000) }),
      ])

      if (userRes.status === 404) {
        return {
          score: 0,
          strengths: [],
          weaknesses: ['GitHub user not found'],
          recommendations: ['Verify the GitHub username and try again'],
        }
      }

      if (userRes.status === 403) {
        return {
          score: 0,
          strengths: [],
          weaknesses: ['GitHub API rate limit exceeded'],
          recommendations: ['Try again later or add a GITHUB_TOKEN environment variable'],
        }
      }

      const userData = await userRes.json()
      const repos: Array<{ name: string; description: string | null; stargazers_count: number; forks_count: number; language: string | null; updated_at: string; topics: string[] }> = await reposRes.json()

      const checks = {
        hasBio: !!userData.bio,
        hasAvatar: !!userData.avatar_url,
        hasWebsite: !!userData.blog,
        hasCompanyOrLocation: !!(userData.company || userData.location),
        hasPinnedRepos: repos.length > 0,
        hasRecentActivity: repos.some((r) => {
          const updated = new Date(r.updated_at)
          const threeMonthsAgo = new Date()
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
          return updated > threeMonthsAgo
        }),
        hasMultipleLanguages: new Set(repos.filter((r) => r.language).map((r) => r.language)).size >= 2,
        hasPopularRepos: repos.some((r) => r.stargazers_count > 0),
        hasProjectDiversity: repos.length >= 5,
        hasDescriptions: repos.filter((r) => r.description).length >= 3,
      }

      const passedChecks = Object.values(checks).filter(Boolean).length
      const totalChecks = Object.values(checks).length
      const score = Math.round((passedChecks / totalChecks) * 100)

      const strengths: string[] = []
      const weaknesses: string[] = []
      const recommendations: string[] = []

      if (checks.hasBio) strengths.push('Profile has a bio')
      else recommendations.push('Add a bio describing your skills and interests')

      if (checks.hasWebsite) strengths.push('Website link in profile')
      else recommendations.push('Add your portfolio or website link to your profile')

      if (checks.hasCompanyOrLocation) strengths.push('Professional context provided')
      else recommendations.push('Add your company or location for credibility')

      if (checks.hasRecentActivity) strengths.push('Recent GitHub activity detected')
      else recommendations.push('Commit more frequently to show active development')

      if (checks.hasMultipleLanguages) strengths.push('Uses multiple programming languages')
      else recommendations.push('Explore different languages to show versatility')

      if (checks.hasPopularRepos) strengths.push('Has repositories with stars/attention')
      else recommendations.push('Work on projects that solve real problems to attract attention')

      if (checks.hasProjectDiversity) strengths.push('Has a diverse portfolio of projects')
      else recommendations.push('Add more projects to showcase your range')

      if (checks.hasDescriptions) strengths.push('Repositories have descriptions')
      else recommendations.push('Add descriptions to your repositories explaining what they do')

      if (repos.length > 0) {
        const readmeCount = repos.filter((r) => r.description && r.description.length > 20).length
        if (readmeCount >= 3) strengths.push('Repositories have detailed READMEs')
        else recommendations.push('Add detailed README files to your key repositories')
      }

      return { score, strengths, weaknesses, recommendations }
    } catch (error) {
      logger.error('GitHub analysis failed', { error: String(error), username })
      return {
        score: 0,
        strengths: [],
        weaknesses: ['GitHub analysis failed'],
        recommendations: ['Ensure the username is correct and try again'],
      }
    }
  }
}

export const gitHubService = new GitHubService()
