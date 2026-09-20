import { expect, test } from '@playwright/test'

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem('sliderule-1002:tutorial-seen', '1'))
})

test('seeds the 1002 and previews the 1002 as a sheet', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('designer-open').click()
  await page.getByTestId('new-select').selectOption('seed:1002')
  await expect(page.getByTestId('rule-id')).toHaveValue('1002')
  await expect(page.locator('line.tick').first()).toBeAttached()
})

test('previews the circular template as a disc', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('designer-open').click()
  await page.getByTestId('new-select').selectOption('template:circularCd')
  await expect(page.locator('circle.limit').first()).toBeVisible()
  await expect(page.locator('line.tick').first()).toBeAttached()
})
