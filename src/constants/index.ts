export const CREDIT_PACKS = {
  free: {
    name: 'Free Trial',
    price: 0,
    credits: 5,
    features: [
      '5 Free Analysis Credits',
      'Instant Resume & Portfolio Scan',
      'Basic Recruiter Insights',
      'No Credit Card Required',
    ],
  },
  starter: {
    name: 'Starter Pack',
    price: 5,
    credits: 20,
    features: [
      '20 Analysis Credits (Never Expire)',
      'AI Resume Builder & ATS PDF Export',
      'Live Portfolio Technical Crawl',
      'GitHub Repo & Activity Scoring',
      'Pay-As-You-Go Flexibility',
    ],
  },
  pro: {
    name: 'Pro Career Pack',
    price: 12,
    credits: 60,
    features: [
      '60 Analysis Credits (Best Value)',
      'Multi-Template ATS Resume Generator',
      'Deep Competency & Mismatch Matrix',
      'Unlimited Re-scans & Versioning',
      'Priority AI Processing',
    ],
  },
} as const

export const SCORE_WEIGHTS = {
  portfolio: 0.4,
  github: 0.3,
  resume: 0.3,
} as const

export const FILE_UPLOAD = {
  maxFileSize: 5 * 1024 * 1024,
  allowedFileTypes: ['application/pdf'],
} as const

export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  dashboard: '/dashboard', // Redirects to reviews
  reviews: '/dashboard/reviews', // Standalone app
  account: '/account',
  history: '/account/history',
  settings: '/account/settings',
  billing: '/account/billing',
} as const

export const API_ROUTES = {
  reviews: '/api/reviews',
  portfolio: '/api/reviews/portfolio',
  github: '/api/reviews/github',
  resume: '/api/reviews/resume',
  stripeWebhook: '/api/webhooks/stripe',
  auth: {
    callback: '/api/auth/callback',
  },
} as const
