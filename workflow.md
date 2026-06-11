# PortfolioPilot SaaS - Master Development Specification

## Project Overview

### Product Name

PortfolioPilot

### Tagline

Get recruiter-style feedback on your portfolio, GitHub profile, and resume before applying for jobs.

### Objective

Build a production-quality SaaS application that demonstrates senior-level full-stack engineering practices while solving a real problem for developers and job seekers.

The application will allow users to:

* Upload resumes
* Submit portfolio URLs
* Submit GitHub profiles
* Receive structured evaluations
* Track improvements over time
* Upgrade to premium plans

This project must prioritize:

* Clean Architecture
* SOLID Principles
* Separation of Concerns
* Scalability
* Maintainability
* Testability
* Accessibility
* Security
* Responsive Design

---

# Technical Stack

## Frontend

* Next.js (App Router)
* TypeScript
* Tailwind CSS
* Shadcn UI
* React Hook Form
* Zod

## Backend

* Next.js Route Handlers
* TypeScript

## Database

* Supabase PostgreSQL

## Authentication

* Supabase Auth

## Storage

* Supabase Storage

## Payments

* Stripe Test Mode

## Deployment

* Vercel

---

# Architecture Requirements

Follow:

## SOLID Principles

### Single Responsibility Principle

Each module must have one responsibility.

Bad:

```ts
UserService.ts

createUser()
deleteUser()
createReview()
uploadResume()
processPayment()
```

Good:

```ts
UserService.ts
ReviewService.ts
ResumeService.ts
PaymentService.ts
```

---

### Open Closed Principle

Components should be extendable without modification.

Use interfaces.

---

### Liskov Substitution Principle

Use abstractions properly.

---

### Interface Segregation Principle

Keep interfaces small.

---

### Dependency Inversion Principle

Depend on abstractions, not concrete implementations.

---

# Project Structure

```text
src/
│
├── app/
│
├── components/
│   ├── common/
│   ├── forms/
│   ├── dashboard/
│   ├── analytics/
│   └── billing/
│
├── features/
│   ├── auth/
│   ├── reviews/
│   ├── reports/
│   ├── subscriptions/
│   ├── github/
│   └── resume/
│
├── services/
│
├── repositories/
│
├── hooks/
│
├── lib/
│
├── types/
│
├── constants/
│
├── utils/
│
├── validations/
│
├── middleware/
│
└── tests/
```

---

# Code Standards

## Naming

### Components

```tsx
ReviewCard.tsx
DashboardHeader.tsx
BillingSummary.tsx
```

### Hooks

```ts
useReviews.ts
useSubscription.ts
useAuth.ts
```

### Services

```ts
review.service.ts
github.service.ts
payment.service.ts
```

### Repository Layer

```ts
review.repository.ts
user.repository.ts
```

---

# Design Standards

## Component Rules

Maximum:

* 200 lines per component

If larger:

Split component.

---

## Function Rules

Maximum:

* 30 lines

Extract logic into services.

---

## File Rules

Avoid utility files becoming dumping grounds.

Every utility should have a clear purpose.

---

# UI Architecture

## BEM Methodology

Even with Tailwind, structure UI logically.

Example:

```html
review-card
review-card__header
review-card__title
review-card__body
review-card__footer
```

Component structure should reflect BEM concepts.

---

# Accessibility

Must support:

* Keyboard navigation
* ARIA labels
* Semantic HTML
* Focus states
* Color contrast

---

# Authentication Module

Features:

* Register
* Login
* Logout
* Forgot Password
* Google OAuth
* Protected Routes

Pages:

```text
/login
/register
/forgot-password
```

---

# User Dashboard

Features:

* Overview
* Score Trends
* Recent Reviews
* Subscription Status

Metrics:

```text
Total Reviews
Average Score
Best Score
Improvement %
```

---

# Portfolio Review Module

Input:

```text
Portfolio URL
Target Role
```

Checks:

* Navigation
* Responsiveness
* Project Quality
* Contact Information
* Call To Action
* Performance Indicators

Outputs:

```text
Portfolio Score
Strengths
Weaknesses
Recommendations
```

---

# GitHub Analysis Module

Input:

```text
GitHub Username
```

Analyze:

* Repository Quality
* README Quality
* Activity
* Commit Frequency
* Pinned Repositories
* Project Diversity

Output:

```text
GitHub Score
```

---

# Resume Analysis Module

Input:

```text
PDF Resume
```

Analyze:

* ATS Compatibility
* Formatting
* Missing Keywords
* Skills Alignment
* Readability

Output:

```text
Resume Score
```

---

# Review Engine

Review consists of:

```text
Portfolio Score
GitHub Score
Resume Score
Overall Score
```

Formula:

```text
Overall Score =
(Portfolio × 40%)
+
(GitHub × 30%)
+
(Resume × 30%)
```

Store every report.

---

# Historical Tracking

Users can compare:

```text
Review #1
Review #2
Review #3
```

Display trends.

---

# Subscription System

Plans:

## Free

```text
1 Review Per Month
Basic Feedback
```

## Pro

```text
Unlimited Reviews
Detailed Reports
Progress Tracking
Priority Processing
```

---

# Stripe Integration

Implement:

* Checkout Session
* Webhooks
* Subscription Activation
* Subscription Cancellation

Use Stripe Test Mode.

Events:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
```

---

# Database Design

## users

```sql
id
email
full_name
avatar_url
created_at
updated_at
```

---

## subscriptions

```sql
id
user_id
stripe_customer_id
stripe_subscription_id
status
plan
current_period_end
created_at
```

---

## reviews

```sql
id
user_id
portfolio_url
github_url
resume_url
overall_score
portfolio_score
github_score
resume_score
created_at
```

---

## reports

```sql
id
review_id
strengths
weaknesses
recommendations
created_at
```

---

# API Standards

Response format:

```json
{
  "success": true,
  "message": "Review generated successfully",
  "data": {}
}
```

Errors:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": []
}
```

---

# Security Requirements

Must implement:

* Input Validation
* Zod Validation
* Rate Limiting
* File Upload Validation
* Server-side Authorization
* Environment Variables
* CSRF Protection
* XSS Prevention

Never trust client-side data.

---

# Logging

Create centralized logger.

Log:

* Authentication Events
* Payment Events
* Review Generation Events
* Errors

---

# Testing

Minimum:

## Unit Tests

Services

Repositories

Utilities

---

## Integration Tests

API Routes

Authentication

Payments

---

## End-to-End Tests

Critical User Flows

---

# Performance

Requirements:

* Lazy Loading
* Dynamic Imports
* Image Optimization
* Database Indexing
* Pagination

---

# CI/CD

Implement:

* ESLint
* Prettier
* Husky
* Lint-Staged

Before commit:

```bash
npm run lint
npm run type-check
npm run test
```

---

# Definition of Done

Feature is complete only when:

✓ Responsive
✓ Accessible
✓ Typed
✓ Tested
✓ Documented
✓ Error Handled
✓ Secure
✓ Follows SOLID
✓ Follows Clean Architecture
✓ Production Ready

---

# Development Order

Phase 1

* Project Setup
* Folder Structure
* Database Design

Phase 2

* Authentication
* Protected Routes

Phase 3

* Dashboard Layout

Phase 4

* Portfolio Analysis Module

Phase 5

* GitHub Analysis Module

Phase 6

* Resume Analysis Module

Phase 7

* Review Engine

Phase 8

* Historical Tracking

Phase 9

* Stripe Billing

Phase 10

* Landing Page

Phase 11

* Testing

Phase 12

* Deployment

Goal: Deliver a production-quality SaaS that looks and feels like software built by a professional engineering team rather than a portfolio CRUD project.
