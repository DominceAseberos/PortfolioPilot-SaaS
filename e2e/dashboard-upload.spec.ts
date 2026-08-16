import { test, expect } from 'playwright/test'

test('dashboard upload locks sources during validation and enables proceed after success', async ({ page }) => {
  let validationCalls = 0
  await page.route('**/api/reviews/validate-resume',
 async route => {
    validationCalls += 1
    await new Promise(resolve => setTimeout(resolve, 400))
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Resume validated successfully.',
        data: {
          metadata: { pageCount: 1 },
          evidence: { identity: { confirmedCount: 2, status: 'verified' }, verificationMessage: 'Identity evidence verified.' },
          detectedLinks: { github: [], linkedin: [], portfolioCandidates: [] },
        },
      }),
    })
  })

  await page.route('**/api/reviews/resume',
 async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          score: 84,
          strengths: ['Clear summary'],
          weaknesses: [],
          recommendations: [],
          details: {
            name: 'Alex Rivera',
            email: 'alex@example.com',
            phone: '+1 555 0100',
            location: 'Austin, TX',
            linkedin: null,
            github: null,
            skills: [{ name: 'TypeScript', found: true }],
            sections: [{ title: 'Professional Summary', type: 'text', text: 'Reliable developer.', acceptsAIImprovements: true }],
            workEntries: [],
            wordCount: 120,
            hasEmail: true,
            hasLinkedIn: false,
            hasGithub: false,
            hasMetrics: false,
            hasActionVerbs: true,
            rawText: 'Alex Rivera software developer',
            isAIAnalyzed: true,
          },
        },
      }),
    })
  })

  await page.goto('/dashboard/reviews')
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles({ name: 'alex-resume.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') })

  await expect(fileInput).toBeDisabled()
  await expect(page.getByText(/Resume Verified/)).toBeVisible({ timeout: 10_000 })
  await expect(fileInput).toBeEnabled()
  expect(validationCalls).toBe(1)

  const proceed = page.getByRole('button', { name: /Proceed/ })
  await expect(proceed).toBeEnabled()
  const resumeRequest = page.waitForRequest(request => request.url().endsWith('/api/reviews/resume'))
  await proceed.click()
  const request = await resumeRequest
  expect(request.method()).toBe('POST')
})
