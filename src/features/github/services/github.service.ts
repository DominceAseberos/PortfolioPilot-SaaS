import type { GitHubAnalysis, GitHubProfile, GitHubRepo, GitHubDetails, GitHubContributions } from '@/types'
import { logger } from '@/lib/logger'
import { normalizeGitHubUsername } from '@/utils/source-normalizers'
import { generateRepoSummaries } from '@/features/ai/services/ai.service'

export class GitHubService {
  async analyze(rawUsername: string, selectedRepos?: string[]): Promise<GitHubAnalysis> {
    const username = normalizeGitHubUsername(rawUsername)
    try {
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'PortfolioPilot',
      }
      if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
      }

      const [userRes, reposRes, eventsRes] = await Promise.all([
        fetch(`https://api.github.com/users/${username}`, { headers, signal: AbortSignal.timeout(10000) }),
        fetch(`https://api.github.com/users/${username}/repos?per_page=30&sort=updated&direction=desc`, { headers, signal: AbortSignal.timeout(10000) }),
        fetch(`https://api.github.com/users/${username}/events?per_page=10`, { headers, signal: AbortSignal.timeout(10000) }),
      ])

      if (userRes.status === 404) {
        return {
          score: 0,
          strengths: [],
          weaknesses: ['GitHub user not found'],
          recommendations: ['Verify the GitHub username and try again'],
        }
      }

      if (!userRes.ok) {
        const errorBody = await userRes.text().catch(() => '')
        return {
          score: 0,
          strengths: [],
          weaknesses: [`GitHub API error (${userRes.status})${errorBody ? ': ' + errorBody.slice(0, 100) : ''}`],
          recommendations: ['Try again later or add a GITHUB_TOKEN environment variable'],
        }
      }

      const userData = await userRes.json()
      const reposData = reposRes.ok ? await reposRes.json() : []
      const eventsData = eventsRes.ok ? await eventsRes.json() : []

      const profile: GitHubProfile = {
        login: userData.login || username,
        name: userData.name || null,
        bio: userData.bio || null,
        avatar_url: userData.avatar_url || null,
        blog: userData.blog || null,
        company: userData.company || null,
        location: userData.location || null,
        public_repos: userData.public_repos || 0,
        followers: userData.followers || 0,
        following: userData.following || 0,
        created_at: userData.created_at || '',
      }

      const repos: GitHubRepo[] = (reposData as Array<{
        name: string; description: string | null; language: string | null;
        stargazers_count: number; forks_count: number; topics: string[];
        updated_at: string
      }>).map((r) => ({
        name: r.name,
        description: r.description,
        language: r.language,
        stars: r.stargazers_count,
        forks: r.forks_count,
        topics: r.topics || [],
        updated_at: r.updated_at,
      }))

      const events = (eventsData as Array<{ type: string; created_at: string; repo: { name: string } }>)
        .slice(0, 10)
        .map((e) => ({
          type: e.type,
          repo: e.repo.name,
          created_at: e.created_at,
        }))

      let topRepoReadmeLength = 0
      let topRepoHasReadme = false
      if (repos.length > 0) {
        let topRepos: GitHubRepo[] = []
        if (selectedRepos && selectedRepos.length > 0) {
          topRepos = repos.filter(r => selectedRepos.includes(r.name)).slice(0, 3)
        } else {
          const sortedRepos = [...repos].sort((a, b) => b.stars - a.stars || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          topRepos = sortedRepos.slice(0, 3)
        }
        
        await Promise.all(topRepos.map(async (repo, index) => {
          try {
            const readmeRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/readme`, { headers, signal: AbortSignal.timeout(5000) })
            if (readmeRes.ok) {
              const readmeData = await readmeRes.json()
              if (readmeData.content) {
                const decoded = Buffer.from(readmeData.content, 'base64').toString('utf8')
                
                if (index === 0) {
                  topRepoReadmeLength = decoded.length
                  topRepoHasReadme = true
                }
                
                const repoIndex = repos.findIndex(r => r.name === repo.name)
                if (repoIndex !== -1) {
                  repos[repoIndex].hasReadme = true
                  repos[repoIndex].readmeLength = decoded.length
                  
                  const cleaned = decoded
                    .replace(/!\[.*?\]\(.*?\)/g, '')
                    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
                    .replace(/[#*`_>\-]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim()
                  
                  if (cleaned) {
                    repos[repoIndex].readmeSummary = cleaned.slice(0, 200) + (cleaned.length > 200 ? '...' : '')
                  }
                }
              }
            }
          } catch { /* ignore error fetching readme */ }
        }))

        const aiSummaries = await generateRepoSummaries(topRepos.map(r => {
          const actualRepo = repos.find(x => x.name === r.name)
          return {
            name: r.name,
            description: r.description,
            language: r.language,
            readmeSummary: actualRepo?.readmeSummary || null
          }
        }))

        aiSummaries.forEach(aiSum => {
          const repoIndex = repos.findIndex(r => r.name.toLowerCase() === aiSum.name.toLowerCase())
          if (repoIndex !== -1) {
            repos[repoIndex].aiResumeDescription = aiSum.professionalSummary
            if (!aiSum.hasGoodReadme) {
              topRepoHasReadme = false
            }
          }
        })
      }

      const details: GitHubDetails = { profile, repos, events }
      const contributions = await this.fetchContributions(username, headers)
      if (contributions) details.contributions = contributions

      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

      const checks: Record<string, boolean> = {
        hasBio: !!profile.bio,
        hasAvatar: !!profile.avatar_url,
        hasWebsite: !!profile.blog,
        hasCompanyOrLocation: !!(profile.company || profile.location),
        hasRecentActivity: repos.some((r) => new Date(r.updated_at) > threeMonthsAgo),
        hasMultipleLanguages: new Set(repos.filter((r) => r.language).map((r) => r.language)).size >= 2,
        hasPopularRepos: repos.some((r) => r.stars > 0),
        hasProjectDiversity: repos.length >= 5,
        hasDescriptions: repos.filter((r) => r.description).length >= 3,
        hasEventActivity: events.some((e) => new Date(e.created_at) > threeMonthsAgo),
        hasDetailedReadme: topRepoHasReadme && topRepoReadmeLength > 500,
      }

      if (contributions) {
        checks.hasYearContributions = contributions.totalContributions > 0
        checks.hasStrongStreak = contributions.currentStreak >= 7
        checks.hasConsistentActivity = contributions.averagePerWeek >= 3
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

      if (checks.hasEventActivity) strengths.push('Recent public activity on GitHub')
      else recommendations.push('Be more active publicly — push commits, open issues, or contribute to discussions')

      if (checks.hasDetailedReadme) strengths.push('Top repository has a detailed README (good documentation)')
      else if (repos.length > 0) {
        recommendations.push('Add a detailed README to your top repository (architecture, setup instructions, etc)')
        weaknesses.push('One or more of your top repositories lacks a high-quality README file')
      }

      if (repos.length > 0) {
        const readmeCount = repos.filter((r) => r.description && r.description.length > 20).length
        if (readmeCount >= 3) strengths.push('Repositories have detailed READMEs')
        else recommendations.push('Add detailed README files to your key repositories')
      }

      if (contributions) {
        if (contributions.totalContributions > 0) {
          strengths.push(`${contributions.totalContributions} contributions in the last year`)
        } else {
          weaknesses.push('No contributions in the last year')
          recommendations.push('Make regular contributions to show active development')
        }
        if (contributions.currentStreak >= 7) {
          strengths.push(`Current contribution streak of ${contributions.currentStreak} days`)
        } else if (contributions.totalContributions > 0) {
          recommendations.push('Build a longer contribution streak by committing daily')
        }
        if (contributions.averagePerWeek >= 3) {
          strengths.push(`Consistent activity — ${contributions.averagePerWeek.toFixed(1)} contributions/week on average`)
        } else if (contributions.totalContributions > 0) {
          recommendations.push('Increase contribution frequency to at least 3x per week')
        }
      }

      return { score, strengths, weaknesses, recommendations, details }
    } catch (error) {
      logger.error('GitHub analysis failed', { error: String(error), username })
      return {
        score: 0,
        strengths: [],
        weaknesses: ['GitHub analysis failed: ' + String(error)],
        recommendations: ['Ensure the username is correct and try again'],
      }
    }
  }

  private async fetchContributions(
    username: string,
    headers: Record<string, string>
  ): Promise<GitHubContributions | null> {
    if (!process.env.GITHUB_TOKEN) return null

    const query = `
      query($username: String!) {
        user(login: $username) {
          contributionsCollection {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                }
              }
            }
          }
        }
      }
    `

    try {
      const res = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          ...headers,
          Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, variables: { username } }),
        signal: AbortSignal.timeout(10000),
      })

      if (!res.ok) return null

      const json = await res.json()
      const calendar = json?.data?.user?.contributionsCollection?.contributionCalendar
      if (!calendar?.weeks) return null

      const days: { date: string; count: number }[] = []
      for (const week of calendar.weeks) {
        for (const day of week.contributionDays) {
          days.push({ date: day.date, count: day.contributionCount })
        }
      }

      const totalContributions = calendar.totalContributions || 0
      const totalWeeks = calendar.weeks.length || 1
      const averagePerWeek = totalWeeks > 0 ? totalContributions / totalWeeks : 0

      let currentStreak = 0
      const today = new Date().toISOString().slice(0, 10)
      for (let i = days.length - 1; i >= 0; i--) {
        if (days[i].date > today) continue
        if (days[i].count > 0) {
          currentStreak++
        } else {
          break
        }
      }

      let longestStreak = 0
      let tempStreak = 0
      for (const day of days) {
        if (day.count > 0) {
          tempStreak++
          longestStreak = Math.max(longestStreak, tempStreak)
        } else {
          tempStreak = 0
        }
      }

      const weeksWithActivity = calendar.weeks.filter(
        (w: { contributionDays: { contributionCount: number }[] }) =>
          w.contributionDays.some((d: { contributionCount: number }) => d.contributionCount > 0)
      ).length

      return { totalContributions, currentStreak, longestStreak, averagePerWeek, weeksWithActivity }
    } catch (error) {
      logger.warn('GitHub GraphQL contributions fetch failed', { error: String(error), username })
      return null
    }
  }
}

export const gitHubService = new GitHubService()
