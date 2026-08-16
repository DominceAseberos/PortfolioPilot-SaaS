import { test, expect } from 'playwright/test'

test('final verified PDF download uses the named attachment endpoint', async ({ page }) => {
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

  await page.goto('/e2e/resume')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: /Classic/ }).click()
  await dialog.getByRole('button', { name: 'Edit Content' }).click()

  const downloadButton = dialog.getByRole('button', { name: /Download PDF/ })
  await expect(downloadButton).toBeEnabled({ timeout: 20_000 })

  const downloadPromise = page.waitForEvent('download', download => download.url().includes('/api/resume/download-pdf'))
  await downloadButton.click()
  const download = await downloadPromise

  expect(download.url()).toContain('/api/resume/download-pdf')
  expect(download.suggestedFilename()).toBe('Alex_Rivera_Improved_Resume.pdf')
  await expect(dialog.getByText(/Render verified/)).toBeVisible()
})
