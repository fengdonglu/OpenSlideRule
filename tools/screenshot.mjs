// Regenerate the README / guide screenshots (docs/assets/*.png).
//
// Requires the dev server on http://localhost:3000 (`npm run dev`) and the
// system Microsoft Edge. It uses playwright-core's `msedge` channel so no
// browser is downloaded. Each shot is captured twice - once with the Chinese UI
// and once with the English UI - so the English docs show an English interface
// and the Chinese docs show a Chinese one. Run with:
//
//   node tools/screenshot.mjs
//
// Set SLIDERULE_URL to point at another origin.
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const BASE = process.env.SLIDERULE_URL ?? 'http://localhost:3000/'
const OUT = 'docs/assets'

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })

async function capture({ file, width, height, locale, prepare }) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 })
  // Pin the UI language and skip the first-run tutorial, so the screenshot
  // matches the document that embeds it.
  await context.addInitScript((lang) => {
    localStorage.setItem('sliderule-1002:tutorial-seen', '1')
    localStorage.setItem('sliderule-1002:locale', lang)
  }, locale)
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'load' })
  await page.waitForTimeout(1000)
  if (prepare) await prepare(page)
  await page.screenshot({ path: `${OUT}/${file}.png` })
  await context.close()
}

const openCircularDesigner = async (page) => {
  await page.locator('[data-test="designer-open"]').click()
  await page.waitForTimeout(600)
  await page
    .locator('[data-test="new-select"]')
    .selectOption('template:circularCd')
    .catch(() => {})
  await page.waitForTimeout(1000)
  // Select a scale so the second form column (its fields) is in the shot.
  await page.locator('.designer-scale').first().click()
  await page.waitForTimeout(800)
}

const shots = [
  { file: 'sliderule-1002', width: 1600, height: 900 },
  {
    file: 'sliderule-designer-circular',
    width: 1600,
    height: 1000,
    prepare: openCircularDesigner,
  },
]
const locales = [
  { suffix: '', locale: 'zh-CN' },
  { suffix: '-en', locale: 'en-US' },
]

for (const shot of shots) {
  for (const { suffix, locale } of locales) {
    await capture({ ...shot, file: `${shot.file}${suffix}`, locale })
  }
}

await browser.close()
console.log(`wrote README screenshots to ${OUT}/`)
