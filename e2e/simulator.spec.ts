import { expect, test } from '@playwright/test'

// Skip the first-run tutorial for every test.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem('sliderule-1002:tutorial-seen', '1'))
})

test('renders the 1002 and switches to the Type 57', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('line.tick').first()).toBeAttached()
  expect(await page.locator('line.tick').count()).toBeGreaterThan(100)
  await page.getByTestId('model-select').selectOption('57')
  await expect(page.getByTestId('model-select')).toHaveValue('57')
  await expect(page.locator('line.tick').first()).toBeAttached()
  // The Type 57 renders far fewer ticks than the 1002 (about 1.4k vs 9.5k), so
  // this only settles inside the band once the switched model has rendered.
  await expect
    .poll(async () => {
      const count = await page.locator('line.tick').count()
      return count > 50 && count < 5000
    })
    .toBe(true)
})
