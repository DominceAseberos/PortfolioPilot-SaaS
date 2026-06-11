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

export type PlanType = 'free' | 'pro'
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'inactive'

export interface Subscription {
  id: string
  user_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: SubscriptionStatus
  plan: PlanType
  current_period_end: string | null
  created_at: string
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
  data?: T
  errors?: string[]
}

export interface PortfolioAnalysis {
  score: number
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
}

export interface GitHubAnalysis {
  score: number
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
}

export interface ResumeAnalysis {
  score: number
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
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
