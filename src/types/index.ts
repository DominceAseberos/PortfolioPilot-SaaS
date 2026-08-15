import type { DynamicSection } from './resume'
import type { ResumeTemplateContract } from './resume-template-contract'

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}



export interface ReviewFullResults {
  portfolio?: PortfolioAnalysis | null
  github?: GitHubAnalysis | null
  resume?: ResumeAnalysis | null
  aiSummary?: AISummaryResult | null
  mismatches?: AIMismatch[]
}

export interface AIMismatch {
  type:
    | 'name'
    | 'location'
    | 'company'
    | 'email'
    | 'github'
    | 'linkedin'
    | 'website'
    | 'skill'
    | 'other'
  severity: 'high' | 'medium' | 'low'
  description: string
  sources: string[]
}

export interface Review {
  id: string
  user_id: string
  portfolio_url: string | null
  github_username: string | null
  resume_url: string | null
  overall_score: number | null
  portfolio_score: number | null
  github_score: number | null
  resume_score: number | null
  detected_name: string | null
  source_types: string[]
  full_results: ReviewFullResults | null
  created_at: string
}

export interface Report {
  id: string
  review_id: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  created_at: string
}

export interface ReviewWithReport extends Review {
  report: Report | null
}

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  code?: string
  data?: T
  errors?: string[]
}

export interface PortfolioCheck {
  name: string
  passed: boolean
  detail: string
  status?: 'passed' | 'failed' | 'unverifiable'
}

export interface PortfolioDetails {
  url: string
  checks: PortfolioCheck[]
  contentHeadings?: string[]
  contentParagraphs?: string[]
  contentLinkCount?: number
  contentImageCount?: number
  isTemplate?: boolean
  hasPlaceholderText?: boolean
  authorName?: string
  socialLinks?: string[]
  projectLinks?: string[]
  markdown?: string
}

export interface PortfolioAnalysis {
  score: number
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  details?: PortfolioDetails
}

export interface GitHubRepo {
  name: string
  description: string | null
  language: string | null
  stars: number
  forks: number
  topics: string[]
  updated_at: string
  hasReadme?: boolean
  readmeLength?: number
  readmeSummary?: string | null
  aiResumeDescription?: string
}

export interface GitHubProfile {
  login?: string | null
  name: string | null
  bio: string | null
  avatar_url: string | null
  blog: string | null
  company: string | null
  location: string | null
  public_repos: number
  followers: number
  following: number
  created_at: string
}

export interface GitHubEvent {
  type: string
  repo: string
  created_at: string
}

export interface GitHubContributions {
  totalContributions: number
  currentStreak: number
  longestStreak: number
  averagePerWeek: number
  weeksWithActivity: number
}

export interface GitHubDetails {
  profile: GitHubProfile
  repos: GitHubRepo[]
  events: GitHubEvent[]
  contributions?: GitHubContributions
}

export interface GitHubAnalysis {
  score: number
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  details?: GitHubDetails
}

export interface ResumeSkill {
  name: string
  found: boolean
}

export interface ResumeSection {
  name: string
  found: boolean
}

export interface ResumeWorkEntry {
  company?: string
  role?: string
  dates?: string
  description?: string
}

export interface ResumeEducation {
  degree?: string
  school?: string
  dates?: string
}

export interface ResumeDetails {
  name: string | null
  email: string | null
  phone?: string | null
  location?: string | null
  linkedin: string | null
  github: string | null
  skills: ResumeSkill[]
  sections: DynamicSection[] | ResumeSection[]
  workEntries: (string | ResumeWorkEntry)[]
  education?: ResumeEducation[]
  projects?: { name?: string; link?: string; description?: string }[]
  professionalSummary?: string | null
  wordCount: number
  hasEmail: boolean
  hasLinkedIn: boolean
  hasGithub: boolean
  hasMetrics: boolean
  hasActionVerbs: boolean
  rawText: string
  isAIAnalyzed: boolean
  predictedSeniority?: string
  tone?: string
  templateContract?: ResumeTemplateContract
}

export interface ResumeAnalysis {
  score: number
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  details?: ResumeDetails
}

export interface AISourceBreakdown {
  score: number
  summary: string
}

export interface AINormalFeedback {
  overallScore: number
  summary: string
  topStrengths: string[]
}

export interface AIDeepFeedback {
  topWeaknesses: string[]
  topRecommendations: string[]
  radar: {
    presentation: number
    openSource: number
    experience: number
    techStack: number
    consistency: number
  }
}

export interface AISummaryResult {
  overallScore: number
  summary: string
  topStrengths: string[]
  topWeaknesses: string[]
  topRecommendations: string[]
  sourceBreakdown: {
    portfolio: AISourceBreakdown | null
    github: AISourceBreakdown | null
    resume: AISourceBreakdown | null
  }
  radar: {
    presentation: number
    openSource: number
    experience: number
    techStack: number
    consistency: number
  }
  normalFeedback?: AINormalFeedback
  deepFeedback?: AIDeepFeedback
}

export interface DashboardMetrics {
  totalReviews: number
  averageScore: number
  bestScore: number
  improvementPercentage: number
}

export interface ScoreTrend {
  date: string
  overall: number
  portfolio: number
  github: number
  resume: number
}

export interface StripePrice {
  id: string
  amount: number
  currency: string
  interval: 'month' | 'year'
}

export interface StripeProduct {
  id: string
  name: string
  description: string
  prices: StripePrice[]
}
