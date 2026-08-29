import { logger } from '@/lib/logger'
import { normalizePortfolioUrl } from '@/utils/source-normalizers'

export interface PortfolioPreviewMetadata {
  embedAllowed: boolean
  blockedBy?: string
  finalUrl: string
  title?: string
  description?: string
}

export interface PortfolioValidationResult {
  isValid: boolean
  message?: string
  isClientRendered?: boolean
  preview?: PortfolioPreviewMetadata
}

/**
 * URLValidationService
 * 
 * SOLID Principles Applied:
 * - Single Responsibility Principle: This service handles ONLY the fast Layer 1 validation logic.
 * - Open/Closed Principle: Designed so we can easily add more rules (like checkBlacklist) without changing existing logic.
 */
export class URLValidationService {
  private readonly TIMEOUT_MS = 10000;
  
  // Blacklist of generic domains that are definitely not personal portfolios
  private readonly BLACKLIST_DOMAINS = [
    'google.com', 'facebook.com', 'youtube.com', 'twitter.com', 
    'instagram.com', 'tiktok.com', 'amazon.com', 'wikipedia.org'
  ];

  // Keywords that strongly indicate a portfolio or resume website
  private readonly PORTFOLIO_KEYWORDS = [
    'portfolio', 'resume', 'projects', 'experience', 
    'about me', 'contact', 'developer', 'engineer', 
    'designer', 'freelance', 'work', 'skills', 
    'education', 'hire', 'about', 'services', 'cv'
  ];

  /**
   * Main validation entry point. 
   * Returns an object indicating success or failure with a user-friendly message.
   */
  public async validatePortfolioUrl(url: string): Promise<PortfolioValidationResult> {
    try {
      const normalizedUrl = normalizePortfolioUrl(url)
      // 1. Blacklist Check
      if (this.isBlacklisted(normalizedUrl)) {
        return { isValid: false, message: 'This domain is blacklisted and cannot be used as a personal portfolio.' };
      }

      // 2. Fetch the HTML
      const response = await this.fetchWithTimeout(normalizedUrl);

      // 3. Content-Type Check (Ensure it's a webpage, not an image/pdf)
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) {
        return { isValid: false, message: 'URL must point to a valid HTML webpage, not a raw file or API endpoint.' };
      }

      const html = await response.text();

      // 4. Content Scanning (informational only)
      // Layer 1 must not reject valid creative, minimalist, non-English, or uncommon
      // portfolios just because they do not contain our vocabulary. Semantic
      // classification belongs to the deeper analysis layer.
      const hasKeywords = this.hasPortfolioKeywords(html);
      const isClientRendered = this.hasClientFrameworkFootprint(html);
      const preview = this.buildPreviewMetadata(response, html, normalizedUrl);

      if (!hasKeywords && !isClientRendered) {
        logger.info('Reachable HTML accepted without hardcoded portfolio keywords', { url: normalizedUrl });
      }

      return { isValid: true, isClientRendered, preview };

    } catch (error: unknown) {
      logger.error('Fast URL validation failed', { error: String(error), url });
      return { 
        isValid: false, 
        message: 'Could not reach the provided URL. Ensure it is publicly accessible and online.' 
      };
    }
  }

  private buildPreviewMetadata(response: Response, html: string, requestedUrl: string): PortfolioPreviewMetadata {
    const xFrameOptions = response.headers.get('x-frame-options')?.toLowerCase() ?? ''
    const contentSecurityPolicy = response.headers.get('content-security-policy')?.toLowerCase() ?? ''
    const frameAncestors = contentSecurityPolicy.match(/(?:^|;)\s*frame-ancestors\s+([^;]+)/i)?.[1]?.trim()

    let embedAllowed = true
    let blockedBy: string | undefined

    if (xFrameOptions.includes('deny') || xFrameOptions.includes('sameorigin')) {
      embedAllowed = false
      blockedBy = 'This site blocks embedded previews with X-Frame-Options.'
    } else if (frameAncestors) {
      const sources = frameAncestors.split(/\s+/).filter(Boolean)
      const permitsExternalFrames = sources.some((source) => source === '*' || /^https?:/i.test(source))
      if (sources.includes("'none'") || !permitsExternalFrames) {
        embedAllowed = false
        blockedBy = 'This site blocks embedded previews with Content-Security-Policy.'
      }
    }

    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
      ?.replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim()
    const description = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1]
      ?? html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i)?.[1]

    return {
      embedAllowed,
      blockedBy,
      finalUrl: response.url || requestedUrl,
      title: title || undefined,
      description: description?.trim() || undefined,
    }
  }

  /**
   * Checks if the URL belongs to a known generic non-portfolio domain.
   */
  private isBlacklisted(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;
      return this.BLACKLIST_DOMAINS.some(domain => hostname.includes(domain));
    } catch {
      return false; // If URL parsing fails, we let the fetch step catch the error
    }
  }

  /**
   * Fetches the URL with a strict timeout and generic User-Agent.
   */
  private async fetchWithTimeout(url: string): Promise<Response> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
      signal: AbortSignal.timeout(this.TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    return response;
  }

  /**
   * Scans raw HTML text for portfolio-specific keywords.
   */
  private hasPortfolioKeywords(html: string): boolean {
    const textContent = html.replace(/<[^>]+>/g, ' ').toLowerCase();
    
    let matchCount = 0;
    for (const kw of this.PORTFOLIO_KEYWORDS) {
      if (new RegExp(`\\b${kw}\\b`).test(textContent)) {
        matchCount++;
      }
    }
    
    return matchCount >= 1; // At least 1 keyword for the fast check
  }

  /**
   * Detects if the site heavily relies on client-side JS (React, Vue, Next.js).
   * This is crucial because these sites hide their text behind loading screens.
   */
  private hasClientFrameworkFootprint(html: string): boolean {
    return /<div[^>]*id=["'](?:root|__next|app)["']/i.test(html) || 
           /<script[^>]+src=["'][^"']+\.(js|jsx)["']/i.test(html) ||
           /data-reactroot|data-v-|ng-version/i.test(html);
  }
}

export const urlValidationService = new URLValidationService();
