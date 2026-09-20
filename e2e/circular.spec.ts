import { expect, test } from '@playwright/test'

// Skip the first-run tutorial for every test.
test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => localStorage.setItem('sliderule-1002:tutorial-seen', '1'))
})

test('loads a circular rule, rotates the rotor and reads a cursor', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('import-file').setInputFiles('e2e/fixtures/circular.json')

  // The imported disc becomes the active model and renders its limit circle and
  // the default cursor line (the store seeds one cursor at the bottom).
  await expect(page.getByTestId('model-select')).toHaveValue('imported')
  await expect(page.locator('circle.limit').first()).toBeAttached()
  await expect(page.locator('line.cursor-line').first()).toBeAttached()
  await expect(page.locator('.circular-readings')).toBeAttached()
  await expect(page.locator('.circular-readings .reading-row').first()).toBeAttached()

  // The rotor starts aligned; capture the rendered disc so the drag below can be
  // checked against an actual re-render rather than mere element presence.
  const discHost = page.locator('.disc-host')
  const before = await discHost.innerHTML()

  // The first reading row (the movable middle C ring) must change when the rotor
  // turns: reading maths, not just a re-render, is what this asserts.
  const firstReading = page.locator('.circular-readings .reading-row input').first()
  const readingBefore = await firstReading.inputValue()

  const overlay = page.locator('.disc-overlay')
  const box = await overlay.boundingBox()
  if (box === null) throw new Error('disc overlay has no layout box')

  // Press the top of the disc (12 o'clock, clear of the default cursor at the
  // bottom) and sweep clockwise to turn the rotor.
  await page.mouse.move(box.x + box.width / 2, box.y + 10)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2, { steps: 5 })
  await page.mouse.up()

  // The rotor turned: the re-rendered disc differs from the aligned one.
  await expect.poll(async () => (await discHost.innerHTML()) !== before).toBe(true)

  // The reading panel reports a different value at the cursor after the turn.
  await expect.poll(async () => firstReading.inputValue()).not.toBe(readingBefore)
})
