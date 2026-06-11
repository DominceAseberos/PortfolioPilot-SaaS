import type { PortfolioAnalysis } from '@/types'
import { logger } from '@/lib/logger'

export class PortfolioService {
  async analyze(portfolioUrl: string, targetRole?: string): Promise<PortfolioAnalysis> {
    try {
      const response = await fetch(portfolioUrl, {
        signal: AbortSignal.timeout(10000),
      })
      const html = await response.text()

      const checks = {
        hasTitle: this.hasTitleTag(html),
        hasMetaDescription: this.hasMetaDescription(html),
        hasViewportMeta: html.includes('viewport') || html.includes('responsive'),
        hasNavigation: this.hasNavigation(html),
        hasContactInfo: this.hasContactInfo(html),
        hasCallToAction: this.hasCallToAction(html),
        hasProjectShowcase: this.hasProjectShowcase(html),
        hasSocialLinks: this.hasSocialLinks(html),
        isUsingModernFramework: this.hasModernFramework(html),
        hasCustomDomain: portfolioUrl.includes('https://') && !portfolioUrl.includes('github.io') && !portfolioUrl.includes('netlify.app'),
      }

      const passedChecks = Object.values(checks).filter(Boolean).length
      const totalChecks = Object.values(checks).length
      const score = Math.round((passedChecks / totalChecks) * 100)

      const strengths: string[] = []
      const weaknesses: string[] = []
      const recommendations: string[] = []

      if (checks.hasTitle) strengths.push('Has a meaningful page title')
      else { weaknesses.push('Missing or generic page title'); recommendations.push('Add a descriptive page title tag') }

      if (checks.hasMetaDescription) strengths.push('Has meta description for SEO')
      else recommendations.push('Add a meta description tag for better search visibility')

      if (checks.hasViewportMeta) strengths.push('Responsive design meta tag present')
      else recommendations.push('Add viewport meta tag for mobile responsiveness')

      if (checks.hasNavigation) strengths.push('Has clear navigation structure')
      else recommendations.push('Add a clear navigation menu')

      if (checks.hasContactInfo) strengths.push('Contact information is accessible')
      else recommendations.push('Add contact information or a contact form')

      if (checks.hasCallToAction) strengths.push('Has clear call-to-action elements')
      else recommendations.push('Add clear call-to-action buttons (e.g., "View My Work", "Contact Me")')

      if (checks.hasProjectShowcase) strengths.push('Showcases projects effectively')
      else recommendations.push('Add a project showcase section with descriptions and links')

      if (checks.hasSocialLinks) strengths.push('Links to social/professional profiles')
      else recommendations.push('Add links to LinkedIn, GitHub, or other professional profiles')

      if (checks.hasCustomDomain) strengths.push('Uses a custom domain name')
      else recommendations.push('Consider using a custom domain for a more professional impression')

      return { score, strengths, weaknesses, recommendations }
    } catch (error) {
      logger.error('Portfolio analysis failed', { error: String(error), url: portfolioUrl })
      return {
        score: 0,
        strengths: [],
        weaknesses: ['Could not access the provided URL'],
        recommendations: ['Ensure the portfolio URL is publicly accessible and try again'],
      }
    }
  }

  private hasTitleTag(html: string): boolean {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    return !!match && match[1].trim().length > 0 && match[1] !== 'Home' && match[1] !== 'Index'
  }

  private hasMetaDescription(html: string): boolean {
    return /<meta\s+[^>]*name=["']description["'][^>]*content=["'][^"']+["']/i.test(html)
  }

  private hasNavigation(html: string): boolean {
    return /<nav/i.test(html) || /class=["'][^"']*(?:nav|menu|navbar|header)["'][^>]*>/i.test(html)
  }

  private hasContactInfo(html: string): boolean {
    return /contact|email|@|phone|tel:|mailto:/i.test(html)
  }

  private hasCallToAction(html: string): boolean {
    return /class=["'][^"']*(?:cta|btn|button|hire|contact)["'][^>]*>/i.test(html) || /href=["'][^"']*(?:contact|hire|work-with-me)["']/i.test(html)
  }

  private hasProjectShowcase(html: string): boolean {
    return /project|portfolio|work|case.study|showcase/i.test(html)
  }

  private hasSocialLinks(html: string): boolean {
    return /linkedin|github|twitter|x\.com|dribbble|behance/i.test(html)
  }

  private hasModernFramework(html: string): boolean {
    return /next\.js|react|vue|angular|__NEXT_DATA__|data-reactroot|ng-app/i.test(html)
  }
}

export const portfolioService = new PortfolioService()
