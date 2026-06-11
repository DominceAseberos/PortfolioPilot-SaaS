# PortfolioPilot-SaaS

Get recruiter-style feedback on your portfolio, GitHub profile, and resume before applying for jobs.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Shadcn UI
- **Backend:** Next.js Route Handlers, TypeScript
- **Database:** Supabase PostgreSQL
- **Auth:** Supabase Auth
- **Storage:** Supabase Storage
- **Payments:** Stripe (Test Mode)
- **Deployment:** Vercel

## Getting Started

1. **Clone the repo**
2. **Set up environment variables** — copy `.env.example` to `.env.local` and fill in your Supabase and Stripe keys
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Run database migrations:**
   The SQL schema is in the project. Run it in your Supabase SQL editor or via the Management API.
5. **Start the dev server:**
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/               # Next.js App Router pages & API routes
│   ├── api/           # API route handlers
│   ├── dashboard/     # Dashboard pages (protected)
│   └── (auth)/        # Auth pages (login, register, forgot-password)
├── components/        # UI components
│   ├── common/        # Shared UI (Button, Input, Card, etc.)
│   ├── dashboard/     # Dashboard-specific components
│   ├── billing/       # Billing/subscription components
│   └── landing/       # Landing page components
├── features/          # Domain logic
│   ├── auth/          # Authentication service & repository
│   ├── reviews/       # Review engine & portfolio analysis
│   ├── github/        # GitHub analysis
│   ├── resume/        # Resume analysis
│   ├── reports/       # Report generation
│   └── subscriptions/ # Stripe billing
├── hooks/             # React hooks
├── lib/               # Supabase client, utilities, logger
├── types/             # TypeScript type definitions
├── constants/         # App constants (plans, routes, limits)
├── utils/             # API response helpers
├── validations/       # Zod schemas
└── tests/             # Jest tests
```

## Features

- Portfolio URL analysis
- GitHub profile scoring
- Resume ATS compatibility check
- Unified review engine with weighted scoring
- Historical tracking with score trends
- Stripe subscription billing (Free / Pro plans)
- Auth with email/password and Google OAuth

## Scripts

```bash
npm run dev         # Start dev server
npm run build       # Production build
npm run lint        # Run ESLint
npm run type-check  # Run TypeScript check
npm run test        # Run Jest tests
npm run format      # Format code with Prettier
```
