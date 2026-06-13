import type { PortfolioAnalysis, PortfolioCheck, PortfolioDetails } from '@/types'
import { logger } from '@/lib/logger'
import TurndownService from 'turndown'
import { analyzePortfolioWithAI } from '@/features/ai/services/ai.service'

interface ExtractedContent {
  headings: string[]
  paragraphs: string[]
  links: string[]
  images: number
  brokenLinks: string[]
  imagesNoAlt: number
  socialLinks: string[]
  projectLinks: string[]
  authorName: string
  markdown?: string
}

function extractContent(html: string): ExtractedContent {
  const stripTag = (s: string) => s.replace(/<[^>]+>/g, '').trim()

  const headings: string[] = []
  const headingRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi
  let m: RegExpExecArray | null
  while ((m = headingRegex.exec(html)) !== null) {
    const text = stripTag(m[1])
    if (text) headings.push(text)
  }

  const paragraphs: string[] = []
  const paraRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi
  while ((m = paraRegex.exec(html)) !== null) {
    const text = stripTag(m[1])
    if (text) paragraphs.push(text)
  }

  const links: string[] = []
  const brokenLinks: string[] = []
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi
  while ((m = linkRegex.exec(html)) !== null) {
    const href = m[1]
    if (href.startsWith('http://') || href.startsWith('https://')) {
      links.push(href)
    }
    if (!href || href === '#' || href === '') {
      brokenLinks.push(href)
    }
  }

  const socialDomains = ['github.com', 'linkedin.com', 'twitter.com', 'x.com', 'medium.com', 'dev.to', 'hashnode.com']
  const projectDomains = ['vercel.app', 'netlify.app', 'herokuapp.com', 'onrender.com', 'firebaseapp.com']
  const socialLinks: string[] = []
  const projectLinks: string[] = []
  
  links.forEach(href => {
    if (socialDomains.some(d => href.includes(d))) socialLinks.push(href)
    else if (projectDomains.some(d => href.includes(d))) projectLinks.push(href)
  })

  let authorName = ''
  const metaAuthorMatch = html.match(/<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i)
  if (metaAuthorMatch && metaAuthorMatch[1]) {
    authorName = metaAuthorMatch[1].trim()
  } else {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    if (titleMatch) {
      authorName = stripTag(titleMatch[1]).split(/[-|]/)[0].trim()
    }
  }

  const images = (html.match(/<img[^>]+>/gi) || []).length
  const imagesNoAlt = (html.match(/<img(?![^>]*\salt=)[^>]*>/gi) || []).length

  const turndownService = new TurndownService({ headingStyle: 'atx' })
  // Strip out irrelevant script and style tags before markdown conversion
  const cleanHtmlForMarkdown = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                                   .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
  let markdown = ''
  try {
    markdown = turndownService.turndown(cleanHtmlForMarkdown)
  } catch (e) {
    logger.warn('Turndown conversion failed', { error: String(e) })
  }

  return { headings, paragraphs, links, images, brokenLinks, imagesNoAlt, socialLinks, projectLinks, authorName, markdown }
}

function countTags(html: string, tag: string): number {
  const regex = new RegExp(`<${tag}[\\s>]`, 'gi')
  return (html.match(regex) || []).length
}

function check(...args: [string, boolean, string]): PortfolioCheck
function check(...args: [string, boolean, string, 'unverifiable']): PortfolioCheck
function check(
  name: string,
  passed: boolean,
  detail: string,
  status?: 'unverifiable'
): PortfolioCheck {
  return { name, passed, detail, status: status || (passed ? 'passed' : 'failed') }
}



export class PortfolioService {
  async analyze(portfolioUrl: string): Promise<PortfolioAnalysis> {
    try {
      let fetchUrl = portfolioUrl
      const headers: Record<string, string> = {}
      
      if (process.env.SCRAPINGANT_API_KEY) {
        fetchUrl = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(portfolioUrl)}&browser=true`
        headers['x-api-key'] = process.env.SCRAPINGANT_API_KEY
      }

      const response = await fetch(fetchUrl, {
        headers,
        signal: AbortSignal.timeout(25000), // Increased timeout for browser rendering
      })
      const html = await response.text()
      
      if (!this.isLikelyPortfolio(html)) {
        throw new Error('NOT_A_PORTFOLIO')
      }

      const content = extractContent(html)
      let allMarkdown = content.markdown || ''

      // LAYER 2 DEEP CRAWLER
      // Collect up to 3 internal sub-pages (e.g. /about, /projects)
      const internalLinks = content.links.filter(href => {
         if (href === '/' || href === '#' || href.startsWith('mailto:')) return false
         return href.startsWith('/') || href.startsWith(portfolioUrl)
      })
      const uniqueInternal = Array.from(new Set(internalLinks)).slice(0, 3)

      if (uniqueInternal.length > 0 && process.env.SCRAPINGANT_API_KEY) {
        logger.info(`Spidering internal pages for ${portfolioUrl}`, { pages: uniqueInternal })
        const promises = uniqueInternal.map(async (link) => {
          const absoluteUrl = link.startsWith('/') ? portfolioUrl.replace(/\/$/, '') + link : link
          const subUrl = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(absoluteUrl)}&browser=true`
          try {
            const subRes = await fetch(subUrl, { headers, signal: AbortSignal.timeout(15000) })
            const subHtml = await subRes.text()
            const subContent = extractContent(subHtml)
            if (subContent.markdown) {
               return `\n\n### Page: ${absoluteUrl}\n\n${subContent.markdown}`
            }
          } catch(e) {
            logger.warn(`Failed to spider internal page: ${absoluteUrl}`, { error: String(e) })
          }
          return ''
        })
        const subMarkdowns = await Promise.all(promises)
        allMarkdown += subMarkdowns.join('')
      }

      const usesClientFramework = this.detectsClientFramework(html)
      const isSparse = content.headings.length < 2 && content.paragraphs.length < 3
      const contentLikelyRendered = usesClientFramework && isSparse

      const hasPlaceholderText = /lorem ipsum|dolor sit amet|insert text here/i.test(html)
      const isTemplate = /html5 up|bootstrap template|tailwind template|colorlib|created by \[author\]/i.test(html)

      const checks: PortfolioCheck[] = []

      // ── SEO / Metadata ──────────────────────────────────
      checks.push(check('Page Title', this.hasValidTitle(html), 'Descriptive <title> tag'))
      checks.push(
        check(
          'Meta Description',
          this.hasMetaDescription(html),
          'Meta description for search engines'
        )
      )
      checks.push(
        check('Title Length', this.hasGoodTitleLength(html), 'Title is between 30-60 characters')
      )
      checks.push(
        check(
          'Description Length',
          this.hasGoodDescriptionLength(html),
          'Meta description is 40-160 characters'
        )
      )
      checks.push(check('OG Tags', this.hasOGTags(html), 'Open Graph tags for social sharing'))
      checks.push(
        check('Twitter Card', this.hasTwitterCard(html), 'Twitter Card tags for X/Twitter sharing')
      )
      checks.push(
        check(
          'Canonical URL',
          this.hasCanonical(html),
          'Canonical link tag to prevent duplicate content'
        )
      )

      // ── HTML Structure ──────────────────────────────────
      checks.push(check('Doctype', /<!DOCTYPE html>/i.test(html), 'HTML5 doctype declared'))
      checks.push(check('HTML Lang', this.hasLangAttr(html), '<html lang="..."> attribute set'))

      if (contentLikelyRendered) {
        const note = 'Unverifiable – site uses client-side rendering (check in DevTools)'
        checks.push(check('Single H1', true, note, 'unverifiable'))
        checks.push(check('Heading Hierarchy', true, note, 'unverifiable'))
        checks.push(check('Semantic Landmarks', true, note, 'unverifiable'))
        checks.push(check('Image Alt Text', true, note, 'unverifiable'))
        checks.push(check('Link Text Quality', true, note, 'unverifiable'))
      } else {
        checks.push(
          check(
            'Single H1',
            countTags(html, 'h1') === 1,
            'Exactly one <h1> tag (found: ' + countTags(html, 'h1') + ')'
          )
        )
        checks.push(
          check(
            'Heading Hierarchy',
            this.hasValidHeadingHierarchy(html),
            'Headings follow logical order (h1→h2→h3)'
          )
        )
        checks.push(
          check(
            'Semantic Landmarks',
            this.hasSemanticLandmarks(html),
            'Uses <main>, <nav>, <header>, <footer> landmarks'
          )
        )
        checks.push(
          check(
            'Image Alt Text',
            content.imagesNoAlt === 0,
            'All images have alt attributes (' + content.imagesNoAlt + ' missing)'
          )
        )
        checks.push(
          check(
            'Link Text Quality',
            !/>(click here|read more|learn more|this link)\b/i.test(html),
            'No generic link text like "click here"'
          )
        )
      }

      // ── Template & Plagiarism ───────────────────────────
      checks.push(check('Original Content', !hasPlaceholderText, 'No placeholder "Lorem Ipsum" text detected'))
      checks.push(check('Custom Design', !isTemplate, 'Does not rely on unmodified standard templates (e.g. HTML5 UP)'))

      // ── Technical ───────────────────────────────────────
      checks.push(
        check(
          'Responsive Design',
          this.hasViewport(html),
          'Viewport meta tag for mobile responsiveness'
        )
      )
      checks.push(
        check(
          'Modern Framework',
          usesClientFramework || this.hasModernFramework(html),
          'Modern framework detected (React, Next.js, Vue, Angular, Astro)'
        )
      )
      checks.push(
        check(
          'Custom Domain',
          this.hasCustomDomain(portfolioUrl),
          'Not a free subdomain (github.io, netlify.app)'
        )
      )
      checks.push(
        check(
          'Structured Data',
          this.hasStructuredData(html),
          'JSON-LD structured data for search engines'
        )
      )
      checks.push(check('Favicon', this.hasFavicon(html), 'Favicon link tag present'))
      checks.push(check('HTTPS', portfolioUrl.startsWith('https://'), 'Served over HTTPS'))

      // ── Navigation & Content ────────────────────────────
      checks.push(check('Navigation', this.hasNavigation(html), '<nav> or navigation menu present'))
      checks.push(check('Contact Info', this.hasContactInfo(html), 'Email, phone, or contact form'))
      checks.push(
        check('Social Links', this.hasSocialLinks(html), 'LinkedIn, GitHub, Twitter, etc.')
      )

      if (contentLikelyRendered) {
        checks.push(
          check('Call to Action', true, 'Unverifiable – content is client-rendered', 'unverifiable')
        )
        checks.push(
          check(
            'Content Headings',
            true,
            'Unverifiable – content is client-rendered',
            'unverifiable'
          )
        )
        checks.push(
          check('Content Text', true, 'Unverifiable – content is client-rendered', 'unverifiable')
        )
        checks.push(
          check(
            'Project Showcase',
            true,
            'Unverifiable – content is client-rendered',
            'unverifiable'
          )
        )
      } else {
        checks.push(
          check(
            'Call to Action',
            this.hasCallToAction(html),
            'CTA buttons like "Hire Me" or "Contact"'
          )
        )
        checks.push(
          check(
            'Project Showcase',
            this.hasProjectShowcase(html),
            'Projects, portfolio, or case studies section'
          )
        )
        checks.push(
          check(
            'Content Headings',
            content.headings.length >= 3,
            content.headings.length + ' heading(s) found (h1-h3)'
          )
        )

        checks.push(
          check(
            'Content Text',
            content.paragraphs.length >= 3,
            content.paragraphs.length + ' paragraph(s) found'
          )
        )
      }

      checks.push(
        check(
          'External Links',
          content.links.length >= 2,
          content.links.length + ' external link(s) found'
        )
      )
      checks.push(
        check(
          'No Broken Links',
          content.brokenLinks.length === 0,
          content.brokenLinks.length + ' empty/missing href(s)'
        )
      )

      // ── Score calculation ───────────────────────────────
      const passed = checks.filter((c) => c.status === 'passed').length
      const unverifiable = checks.filter((c) => c.status === 'unverifiable').length
      const scored = checks.length - unverifiable
      const score = scored > 0 ? Math.round((passed / scored) * 100) : 0

      const strengths: string[] = checks.filter((c) => c.status === 'passed').map((c) => c.detail)

      const weaknesses: string[] = checks
        .filter((c) => c.status === 'failed')
        .map((c) => 'Missing: ' + c.detail)

      const recommendations: string[] = checks
        .filter((c) => c.status === 'failed')
        .map((c) => this.getRecommendation(c.name))

      if (contentLikelyRendered) {
        recommendations.push(
          'Run a local audit (Lighthouse) on this site — some checks could not be verified via HTML fetch because the site uses JavaScript rendering'
        )
      }

      const details: PortfolioDetails = {
          url: portfolioUrl,
          checks,
          contentHeadings: content.headings.slice(0, 10),
          contentParagraphs: content.paragraphs.slice(0, 5),
          contentLinkCount: content.links.length,
          contentImageCount: content.images,
          hasPlaceholderText,
          isTemplate,
          authorName: content.authorName,
          socialLinks: content.socialLinks,
          projectLinks: content.projectLinks,
          markdown: allMarkdown,
        }

      if (allMarkdown) {
        logger.info(`Running Layer 2 AI Distillation for ${portfolioUrl}`)
        const aiResult = await analyzePortfolioWithAI(allMarkdown)
        if (aiResult) {
          return {
            score: aiResult.score ?? score,
            strengths: aiResult.strengths?.length ? aiResult.strengths : strengths,
            weaknesses: aiResult.weaknesses?.length ? aiResult.weaknesses : weaknesses,
            recommendations: aiResult.recommendations?.length ? aiResult.recommendations : recommendations,
            details,
          }
        }
      }

      return { score, strengths, weaknesses, recommendations, details }
    } catch (error) {
      logger.error('Portfolio analysis failed', { error: String(error), url: portfolioUrl })
      
      if (error instanceof Error && error.message === 'NOT_A_PORTFOLIO') {
        return {
          score: 0,
          strengths: [],
          weaknesses: ['Target URL does not appear to be a personal portfolio or resume website'],
          recommendations: ['Please provide a direct link to your personal portfolio, portfolio platform (like Behance/Dribbble), or personal website.'],
          details: { url: portfolioUrl, checks: [] },
        }
      }
      
      return {
        score: 0,
        strengths: [],
        weaknesses: ['Could not access the provided URL'],
        recommendations: ['Ensure the portfolio URL is publicly accessible and try again'],
        details: { url: portfolioUrl, checks: [] },
      }
    }
  }

  private isLikelyPortfolio(html: string): boolean {
    // We are migrating to Layer 2 AI Extraction. 
    // We no longer strictly block based on simple keyword regex heuristics
    // as it frequently produces false negatives for minimalist portfolios.
    return true
  }

  private getRecommendation(checkName: string): string {
    const map: Record<string, string> = {
      'Page Title': 'Add a descriptive <title> tag (50-60 characters, front-loaded with keywords)',
      'Meta Description': 'Add a meta description tag (40-160 characters with a call to action)',
      'Title Length':
        'Keep the title between 30-60 characters so it is not truncated in search results',
      'Description Length': 'Keep meta description between 40-160 characters',
      'OG Tags': 'Add og:title, og:description, and og:image meta tags for social sharing previews',
      'Twitter Card':
        'Add twitter:card, twitter:title, twitter:description meta tags for X/Twitter sharing',
      'Canonical URL': 'Add a <link rel="canonical"> tag to prevent duplicate content issues',
      Doctype: 'Add <!DOCTYPE html> at the top of the page',
      'HTML Lang':
        'Add lang="en" (or appropriate language) to the <html> tag for accessibility and SEO',
      'Single H1':
        'Use exactly one <h1> tag per page. Multiple H1s confuse search engines and screen readers',
      'Heading Hierarchy':
        'Do not skip heading levels (h1→h2→h3). Skipped levels break screen reader navigation',
      'Semantic Landmarks':
        'Use <main>, <nav>, <header>, <footer> elements for better accessibility and SEO',
      'Image Alt Text':
        'Add descriptive alt text to all images. Decorative images should use alt=""',
      'Link Text Quality':
        'Replace generic link text ("click here") with descriptive text describing the destination',
      'Responsive Design': 'Add <meta name="viewport"> tag for mobile responsiveness',
      'Modern Framework': 'Consider using a modern framework like Next.js or Astro',
      'Custom Domain':
        'Use a custom domain (yourname.com) instead of a free subdomain for professionalism',
      'Structured Data':
        'Add JSON-LD structured data (Person schema, etc.) for better search results',
      Favicon: 'Add a favicon link tag so the site shows an icon in browser tabs',
      HTTPS: 'Ensure your site is served over HTTPS',
      Navigation: 'Add a <nav> element or navigation menu with clear links',
      'Contact Info': 'Add visible contact information or a contact form',
      'Social Links': 'Add links to LinkedIn, GitHub, or other professional profiles',
      'Call to Action': 'Add clear call-to-action buttons (e.g., "View My Work", "Contact Me")',
      'Project Showcase': 'Add a project showcase section with descriptions, tech stack, and links',
      'Content Headings': 'Add more section headings (h1-h3) to structure your content',
      'Content Text':
        'Add more written content (at least 3 paragraphs) to showcase your experience',
      'External Links': 'Include more external links to projects, social profiles, or references',
      'No Broken Links': 'Fix empty or broken href attributes on all anchor tags',
      'Original Content': 'Remove all placeholder "Lorem Ipsum" text and replace it with your actual experience.',
      'Custom Design': 'Modify your template further. Relying heavily on default HTML5 UP or Bootstrap themes makes your portfolio blend in.',
    }
    return map[checkName] || 'Improve: ' + checkName
  }

  private detectsClientFramework(html: string): boolean {
    const astro =
      /astro-island|data-astro-cid-|astro-dev-toolbar|<script[^>]*\/_astro\/|View-Transitions/i.test(
        html
      )
    const nextjs =
      /__NEXT_DATA__|self\.__next_f|_next\/static\/chunks/i.test(html) ||
      /<div[^>]*id=["']__next["']/i.test(html)
    const nuxt = /__NUXT__|_nuxt\/|<div[^>]*id=["']__nuxt["']/i.test(html)
    const svelte =
      /__sveltekit|data-sveltekit|svelte-[a-f0-9]{6}/i.test(html) || /_app\/immutable\//i.test(html)
    const remix = /__remixContext|data-remix-run/i.test(html) || /build\/_assets\//i.test(html)
    const react = /data-reactroot|data-reactid/i.test(html)
    const vue = /data-v-[a-f0-9]{6,}/i.test(html) || /ng-app/i.test(html)
    const angular = /ng-version/i.test(html)
    const gatsby = /___gatsby|<div[^>]*id=["']___gatsby["']/i.test(html)

    return astro || nextjs || nuxt || svelte || remix || react || vue || angular || gatsby
  }

  private hasValidTitle(html: string): boolean {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (!match) return false
    const title = match[1].trim()
    return title.length > 0 && title !== 'Home' && title !== 'Index' && title !== 'Portfolio'
  }

  private hasGoodTitleLength(html: string): boolean {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (!match) return false
    const len = match[1].trim().length
    return len >= 30 && len <= 60
  }

  private hasGoodDescriptionLength(html: string): boolean {
    const match = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    if (!match) return false
    const len = match[1].length
    return len >= 40 && len <= 160
  }

  private hasMetaDescription(html: string): boolean {
    return /<meta\s+[^>]*name=["']description["'][^>]*content=["'][^"']+["']/i.test(html)
  }

  private hasOGTags(html: string): boolean {
    return /property=["']og:title["']/i.test(html) && /property=["']og:description["']/i.test(html)
  }

  private hasTwitterCard(html: string): boolean {
    return /name=["']twitter:card["']/i.test(html)
  }

  private hasCanonical(html: string): boolean {
    return /<link[^>]*rel=["']canonical["'][^>]*href=["'][^"']+["']/i.test(html)
  }

  private hasLangAttr(html: string): boolean {
    return /<html[^>]*\slang=["'][^"']+["']/i.test(html)
  }

  private hasValidHeadingHierarchy(html: string): boolean {
    const tags: string[] = []
    const regex = /<(h[1-6])[^>]*>/gi
    let m: RegExpExecArray | null
    while ((m = regex.exec(html)) !== null) {
      tags.push(m[1])
    }
    if (tags.length === 0) return false
    let prev = 0
    for (const tag of tags) {
      const level = parseInt(tag[1])
      if (level - prev > 1) return false
      prev = level
    }
    return true
  }

  private hasSemanticLandmarks(html: string): boolean {
    const landmarks = ['<main', '<nav', '<header', '<footer']
    const found = landmarks.filter((l) => html.includes(l)).length
    return found >= 2
  }

  private hasViewport(html: string): boolean {
    return html.includes('viewport') || html.includes('responsive')
  }

  private hasNavigation(html: string): boolean {
    return /<nav/i.test(html) || /class=["'][^"']*(?:nav|menu|navbar|header)["'][^>]*>/i.test(html)
  }

  private hasContactInfo(html: string): boolean {
    return /contact|email|@|phone|tel:|mailto:/i.test(html)
  }

  private hasCallToAction(html: string): boolean {
    return (
      /class=["'][^"']*(?:cta|btn|button|hire|contact)["'][^>]*>/i.test(html) ||
      /href=["'][^"']*(?:contact|hire|work-with-me)["']/i.test(html)
    )
  }

  private hasProjectShowcase(html: string): boolean {
    return /project|portfolio|work|case.study|showcase/i.test(html)
  }

  private hasSocialLinks(html: string): boolean {
    return /linkedin|github|twitter|x\.com|dribbble|behance/i.test(html)
  }

  private hasModernFramework(html: string): boolean {
    const patterns = [
      /__NEXT_DATA__|self\.__next_f|_next\/static\/chunks/i,
      /__NUXT__|_nuxt\//i,
      /astro-island|data-astro-cid-|\/_astro\//i,
      /__sveltekit|data-sveltekit|svelte-/i,
      /__remixContext|data-remix-run/i,
      /data-reactroot|data-reactid/i,
      /data-v-[a-f0-9]{6,}/i,
      /ng-version/i,
      /___gatsby/i,
      /q:container|q:host/i,
      /data-hk=/i,
    ]
    return patterns.some((p) => p.test(html))
  }

  private hasCustomDomain(url: string): boolean {
    return url.includes('https://') && !url.includes('github.io') && !url.includes('netlify.app')
  }

  private hasStructuredData(html: string): boolean {
    return /<script[^>]*type=["']application\/ld\+json["']/i.test(html)
  }

  private hasFavicon(html: string): boolean {
    return /<link[^>]*rel=["'](?:shortcut )?icon["']/i.test(html)
  }
}

export const portfolioService = new PortfolioService()
