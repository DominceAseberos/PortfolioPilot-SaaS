import { normalizeGitHubUsername, normalizePortfolioUrl } from '@/utils/source-normalizers'
import { urlValidationService } from '@/features/reviews/services/validation.service'

export interface DetectedLink {
  url: string
  normalized: string
}

export interface DetectedGitHubLink extends DetectedLink {
  username: string
}

export interface ValidatedDetectedLink extends DetectedLink {
  isValid: boolean
  message?: string
}

export interface ValidatedGitHubLink extends DetectedGitHubLink {
  isValid: boolean
  message?: string
  profile?: {
    login: string
    name: string
    avatarUrl?: string
    bio?: string
    publicRepos?: number
    followers?: number
  }
}

export interface ResumeDetectedLinks {
  github: DetectedGitHubLink[]
  linkedin: DetectedLink[]
  portfolioCandidates: DetectedLink[]
}

export interface ResumeValidatedLinks {
  github: ValidatedGitHubLink[]
  linkedin: DetectedLink[]
  portfolioCandidates: ValidatedDetectedLink[]
}

const URL_PATTERN =
  /(?:https?:\/\/|www\.)[^\s<>"']+|(?:github\.com|linkedin\.com)\/[^\s<>"']+|\b(?![\w.+-]+@)(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>"']*)?/gi

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const value = key(item).toLowerCase()
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

function cleanUrl(raw: string): string {
  return raw.trim().replace(/^[([<{]+/g, '').replace(/[)\].,;:}>]+$/g, '')
}

function isLikelyCodeToken(url: string): boolean {
  return /\.(js|jsx|ts|tsx|css|html)$/i.test(url) && !url.includes('/')
}

function withProtocol(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

export class ResumeLinkExtractionService {
  extract(text: string): ResumeDetectedLinks {
    const rawLinks = text.match(URL_PATTERN) ?? []
    const github: DetectedGitHubLink[] = []
    const linkedin: DetectedLink[] = []
    const portfolioCandidates: DetectedLink[] = []

    for (const raw of rawLinks) {
      const url = cleanUrl(raw)
      if (isLikelyCodeToken(url)) continue

      const normalized = withProtocol(url)
      const lower = normalized.toLowerCase()

      if (lower.includes('github.com/')) {
        const username = normalizeGitHubUsername(normalized)
        github.push({ url, normalized: `https://github.com/${username}`, username })
        continue
      }

      if (lower.includes('linkedin.com/in/')) {
        linkedin.push({ url, normalized })
        continue
      }

      try {
        const parsed = new URL(normalized)
        const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')
        const isIgnoredHost =
          hostname === 'github.com' ||
          hostname === 'linkedin.com' ||
          hostname === 'mailto' ||
          hostname.endsWith('githubusercontent.com')

        if (!isIgnoredHost) {
          portfolioCandidates.push({ url, normalized: normalizePortfolioUrl(normalized) })
        }
      } catch {
        // Ignore malformed links found in extracted PDF text.
      }
    }

    return {
      github: uniqueBy(github, (link) => link.username),
      linkedin: uniqueBy(linkedin, (link) => link.normalized),
      portfolioCandidates: uniqueBy(portfolioCandidates, (link) => link.normalized),
    }
  }

  async validate(text: string): Promise<ResumeValidatedLinks> {
    const detected = this.extract(text)
    const github = await Promise.all(detected.github.map((link) => this.validateGitHub(link)))
    const portfolioCandidates = await Promise.all(
      detected.portfolioCandidates.map((link) => this.validatePortfolio(link))
    )

    return {
      github,
      linkedin: detected.linkedin,
      portfolioCandidates,
    }
  }

  private async validateGitHub(link: DetectedGitHubLink): Promise<ValidatedGitHubLink> {
    try {
      const headers: Record<string, string> = {
        'User-Agent': 'PortfolioPilot-Resume-Link-Validation',
        Accept: 'application/vnd.github.v3+json',
      }
      if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `token ${process.env.GITHUB_TOKEN}`
      }

      const response = await fetch(`https://api.github.com/users/${link.username}`, {
        headers,
        signal: AbortSignal.timeout(10000),
      })

      if (response.status === 404) {
        return { ...link, isValid: false, message: 'GitHub user not found' }
      }
      if (!response.ok) {
        return { ...link, isValid: false, message: 'GitHub profile could not be verified' }
      }

      const data = await response.json()
      if (data.type === 'Organization') {
        return { ...link, isValid: false, message: 'Organization profiles are not supported' }
      }

      return {
        ...link,
        isValid: true,
        profile: {
          login: data.login,
          name: data.name || data.login,
          avatarUrl: data.avatar_url,
          bio: data.bio,
          publicRepos: data.public_repos,
          followers: data.followers,
        },
      }
    } catch {
      return { ...link, isValid: false, message: 'GitHub profile could not be reached' }
    }
  }

  private async validatePortfolio(link: DetectedLink): Promise<ValidatedDetectedLink> {
    const validation = await urlValidationService.validatePortfolioUrl(link.normalized)
    return {
      ...link,
      isValid: validation.isValid,
      message: validation.message,
    }
  }
}

export const resumeLinkExtractionService = new ResumeLinkExtractionService()
