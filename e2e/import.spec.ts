import { expect, test } from '@playwright/test'

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem('sliderule-1002:tutorial-seen', '1'))
})

test('a rule exported by the designer loads back into the simulator', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('designer-open').click()
  await page.getByTestId('new-select').selectOption('seed:57')

  await page.getByTestId('export-toggle').click()
  const download = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-definition').click(),
  ]).then(([d]) => d)
  const file = await download.path()
  expect(file).toBeTruthy()

  await page.getByTestId('designer-close').click()
  await page.getByTestId('import-file').setInputFiles(file as string)

  await expect(page.getByTestId('model-select')).toHaveValue('imported')
  await expect(page.locator('line.tick').first()).toBeAttached()
})
