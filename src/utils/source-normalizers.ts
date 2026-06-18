export function normalizePortfolioUrl(input: string): string {
  const trimmed = input.trim().replace(/[),.;:]+$/g, '')
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function normalizeGitHubUsername(input: string): string {
  const trimmed = input.trim().replace(/[),.;:]+$/g, '')
  const match = trimmed.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38})(?:\/.*)?$/i
  )
  return match ? match[1] : trimmed
}

export function isValidGitHubUsername(username: string): boolean {
  return /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/i.test(username)
}

export function isLikelyPortfolioUrl(input: string): boolean {
  try {
    const url = new URL(normalizePortfolioUrl(input))
    const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    return (
      !!hostname &&
      !hostname.endsWith('github.com') &&
      !hostname.endsWith('linkedin.com') &&
      !hostname.endsWith('mailto')
    )
  } catch {
    return false
  }
}
