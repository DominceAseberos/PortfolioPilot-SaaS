export const CREDIT_PACKS = {
  free: {
    name: 'Guest Pass',
    price: 0,
    credits: 0,
    features: [
      '1 Free Review (No Sign-Up)',
      'Basic Portfolio Feedback',
      'Preview Mode Only',
    ],
  },
  starter: {
    name: 'Starter Pack',
    price: 10,
    credits: 100,
    features: [
      '100 AI Analysis Credits',
      'Portfolio & Resume Analysis',
      'GitHub Deep Scans',
      'Historical Comparisons',
      'Pay-As-You-Go Flexibility',
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
