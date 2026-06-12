export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    reviewsPerMonth: 1,
    features: [
      '1 Review Per Month',
      'Basic Feedback',
      'Portfolio Analysis',
    ],
  },
  pro: {
    name: 'Pro',
    price: 29,
    reviewsPerMonth: -1,
    features: [
      'Unlimited Reviews',
      'Detailed Reports',
      'Progress Tracking',
      'Priority Processing',
      'GitHub Analysis',
      'Resume Analysis',
      'Historical Comparisons',
    ],
  },
} as const

export const SCORE_WEIGHTS = {
  portfolio: 0.4,
  github: 0.3,
  resume: 0.3,
} as const

export const REVIEW_LIMITS = {
  free: 1,
  pro: -1,
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
