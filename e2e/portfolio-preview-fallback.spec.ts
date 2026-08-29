import { test, expect, type Page } from 'playwright/test'

async function switchToPortfolioMode(page: Page) {
  await page.evaluate(() => {
    const button = Array.from(document.querySelectorAll('button')).find((item) => item.textContent?.includes('Live Portfolio URL'))
    if (!button) throw new Error('Portfolio mode button was not found')
    button.click()
  })
}

test('uses native fallback when a validated portfolio blocks iframe embedding', async ({ page }) => {
  await page.goto('/dashboard/reviews')
  await switchToPortfolioMode(page)

  const input = page.getByPlaceholder('Enter portfolio URL...')
  await input.fill('https://www.dominceaseberos.tech')
  await input.press('Enter')

  const fallback = page.getByTestId('portfolio-preview-fallback')
  await expect(fallback).toBeVisible({ timeout: 30_000 })
  await expect(fallback).toContainText(/Verified public site/i)
  await expect(fallback).toContainText(/X-Frame-Options/i)
  await expect(fallback.getByRole('link', { name: /Open live portfolio/i })).toHaveAttribute('href', /dominceaseberos\.tech/)
  await expect(page.locator('iframe[title="Portfolio Live Preview"]')).toHaveCount(0)
})

test('keeps the live iframe path for sites that allow embedding', async ({ page }) => {
  await page.route('**/api/reviews/validate-portfolio', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          valid: true,
          isClientRendered: false,
          preview: {
            embedAllowed: true,
            finalUrl: 'https://example.com/',
            title: 'Example Portfolio',
          },
        },
      }),
    })
  })

  await page.goto('/dashboard/reviews')
  await switchToPortfolioMode(page)

  const input = page.getByPlaceholder('Enter portfolio URL...')
  await input.fill('https://example.com')
  await input.press('Enter')

  await expect(page.locator('iframe[title="Portfolio Live Preview"]')).toHaveCount(1, { timeout: 15_000 })
  await expect(page.getByTestId('portfolio-preview-fallback')).toHaveCount(0)
})
