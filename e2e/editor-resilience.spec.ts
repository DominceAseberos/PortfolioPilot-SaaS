import { test, expect, type Page } from 'playwright/test'

async function openEditor(page: Page) {
  await page.goto('/e2e/resume')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: /Classic/ }).click()
  await dialog.getByRole('button', { name: 'Edit Content' }).click()
  await expect(dialog.getByText('Layout Preflight')).toBeVisible()
  return dialog
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { if (window.top === window) localStorage.clear() })
})

test('resume editor traps focus and persists/restores local versions', async ({ page }) => {
  const dialog = await openEditor(page)

  const activeInside = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]')
    return !!modal && modal.contains(document.activeElement)
  })
  expect(activeInside).toBe(true)

  const nameInput = dialog.locator('input').first()
  await expect(nameInput).toHaveValue('Alex Rivera')

  await dialog.getByRole('button', { name: /Versions/ }).click()
  await dialog.getByRole('button', { name: 'Save Current' }).click()
  await expect(dialog.getByText('Version 1')).toBeVisible()
  const versionCountAfterSave = await page.evaluate(() => {
    const key = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .find(value => value?.includes('e2e:resume-editor'))
    if (!key) return -1
    return JSON.parse(localStorage.getItem(key) ?? '{}').versions?.length ?? -1
  })
  expect(versionCountAfterSave).toBeGreaterThan(0)

  await dialog.getByRole('button', { name: 'Close version history' }).click()
  await nameInput.fill('Alex Rivera Edited')
  await expect(nameInput).toHaveValue('Alex Rivera Edited')
  await page.waitForTimeout(900)
  const storedVersionCount = await page.evaluate(() => {
    const key = Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index))
      .find(value => value?.includes('e2e:resume-editor'))
    if (!key) return -1
    return JSON.parse(localStorage.getItem(key) ?? '{}').versions?.length ?? -1
  })
  expect(storedVersionCount).toBeGreaterThan(0)

  page.once('dialog', browserDialog => browserDialog.accept())
  await dialog.getByRole('button', { name: 'Close resume generator' }).click()
  await page.getByRole('button', { name: 'Reopen Resume Editor' }).click()

  const reopened = page.getByRole('dialog')
  await reopened.getByRole('button', { name: /Classic/ }).click()
  await reopened.getByRole('button', { name: 'Edit Content' }).click()
  const reopenedName = reopened.locator('input').first()
  await expect(reopenedName).toHaveValue('Alex Rivera Edited')

  await reopened.getByRole('button', { name: /Versions/ }).click()
  await reopened.getByRole('button', { name: 'Restore' }).first().click()
  await expect(reopened.locator('input').first()).toHaveValue('Alex Rivera')
})

test('resume editor shows rate-limit feedback and completes verified download', async ({ page }) => {
  await page.route('**/api/resume/optimize', async route => {
    await route.fulfill({
      status: 429,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        code: 'RATE_LIMITED',
        error: 'Too many requests. Please retry in 12 seconds.',
        retryAfterSeconds: 12,
      }),
    })
  })

  await page.route('**/api/resume/verify-pdf', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'verified',
        actualPages: 1,
        estimatedPages: 1,
        pageDelta: 0,
        contentCoverage: 1,
        checkedContentCount: 8,
        missingContent: [],
        warnings: [],
        preflight: { fit: 'comfortable', estimatedPages: 1, score: 95, warnings: [] },
      }),
    })
  })

  const dialog = await openEditor(page)

  const optimize = dialog.getByRole('button', { name: /Optimize for this template/ })
  await expect(optimize).toBeVisible()
  await optimize.click()
  await expect(dialog.getByText(/Too many requests\. Please retry in 12 seconds\./)).toBeVisible()

  const downloadButton = dialog.getByRole('button', { name: /Download PDF/ })
  await expect(downloadButton).toBeEnabled({ timeout: 20_000 })

  const downloadPromise = page.waitForEvent('download', download => download.url().includes('/api/resume/download-pdf'))
  await downloadButton.click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/Improved_Resume\.pdf$/)
  await expect(dialog.getByText(/Render verified/)).toBeVisible()
})
