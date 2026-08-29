import { find as linkifyFind } from 'linkifyjs'
import { parse as parseTld } from 'tldts'
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

// Domains we explicitly never want to classify as a personal portfolio
const IGNORED_DOMAINS = new Set([
  'github.com',
  'linkedin.com',
  'githubusercontent.com',
  'google.com',
  'youtube.com',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'npmjs.com',
  'npmjs.org',
  'nodejs.org',
  'pypi.org',
  'docs.python.org',
  'developer.mozilla.org',
  'stackoverflow.com',
  'medium.com',
  'dev.to',
])

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const value = key(item).toLowerCase()
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

function withProtocol(url: string): string {
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

/**
 * Uses tldts to confirm the hostname contains a real, ICANN-registered public TLD.
 * This is the key guard: it rejects things like `self.env`, `simpy.Resource`,
 * or any other code token that accidentally looks like a domain.
 * - `self.env`      → isIcann: false  ✗ rejected
 * - `simpy.Resource`→ isIcann: false  ✗ rejected
 * - `johnsmith.dev` → isIcann: true   ✓ accepted
 */
function hasRealTLD(href: string): boolean {
  try {
    const { hostname } = new URL(href)
    const result = parseTld(hostname)
    return result.isIcann === true
  } catch {
    return false
  }
}

export class ResumeLinkExtractionService {
  extract(text: string): ResumeDetectedLinks {
    // linkifyjs finds URLs and emails using ICANN TLD data — no false positives from code text
    const found = linkifyFind(text, { defaultProtocol: 'https' })

    const github: DetectedGitHubLink[] = []
    const linkedin: DetectedLink[] = []
    const portfolioCandidates: DetectedLink[] = []

    for (const item of found) {
      // Skip emails — they are not portfolio/github links
      if (item.type === 'email') continue

      const raw = item.value
      const normalized = withProtocol(item.href)
      const lower = normalized.toLowerCase()

      // Secondary guard: ensure the TLD is real via tldts (eliminates any remaining false positives)
      if (!hasRealTLD(normalized)) continue

      // --- Route to the correct bucket ---

      if (lower.includes('github.com/')) {
        const username = normalizeGitHubUsername(normalized)
        // Ignore github.com with no username path (bare domain link)
        if (!username) continue
        github.push({ url: raw, normalized: `https://github.com/${username}`, username })
        continue
      }

      if (lower.includes('linkedin.com/in/')) {
        linkedin.push({ url: raw, normalized })
        continue
      }

      // Any other valid link is a portfolio candidate, unless it's on the ignored list
      try {
        const parsed = new URL(normalized)
        const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '')

        const isIgnored = [...IGNORED_DOMAINS].some(
          (d) => hostname === d || hostname.endsWith(`.${d}`)
        )

        if (!isIgnored) {
          portfolioCandidates.push({ url: raw, normalized: normalizePortfolioUrl(normalized) })
        }
      } catch {
        // Malformed URL — skip
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
