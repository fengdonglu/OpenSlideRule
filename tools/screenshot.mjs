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

// Open the designer, load a built-in model and select one of its scales, so the
// Calculation panel shows that scale's mapping fields next to the preview.
const showScale = (model, scaleName, after) => async (page) => {
  await page.locator('[data-test="designer-open"]').click()
  await page.waitForTimeout(600)
  await page.locator('[data-test="new-select"]').selectOption(model)
  await page.waitForTimeout(1200)
  await page.locator('.designer-scale', { hasText: scaleName }).first().click()
  await page.waitForTimeout(600)
  if (after) await after(page)
  // Selecting a row deep in the list scrolls the form, and a tall Scale fields
  // panel can push the mapping fields below the fold. Reset the scroll, then
  // bring the Calculation panel (the last one) to the top of its container.
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('*')) {
      if (el.scrollTop > 0) el.scrollTop = 0
    }
    const panels = document.querySelectorAll('.designer-panel')
    panels[panels.length - 1]?.scrollIntoView({ block: 'start' })
  })
  await page.waitForTimeout(600)
}

// The expr example: seed the expr preset, then type a formula whose inverse is
// left blank (the loader inverts it numerically).
const seedExpr = async (page) => {
  await page.locator('select:has(option[value="expr"])').first().selectOption('expr')
  await page.waitForTimeout(600)
  // The field label contains "position(x)" in both locales, so this is language
  // independent. Leave the inverse blank: the loader inverts numerically.
  await page.locator('label', { hasText: 'position(x)' }).locator('input').fill('log10(sqrt(x))')
  await page.waitForTimeout(900)
}

const shots = [
  { file: 'sliderule-1002', width: 1600, height: 900 },
  {
    file: 'sliderule-designer-circular',
    width: 1600,
    height: 1000,
    prepare: openCircularDesigner,
  },
  // Designer calculations, by example: one shot per mapping kind.
  { file: 'designer-calc-log', width: 1600, height: 1000, prepare: showScale('seed:1002', 'C · C') },
  {
    file: 'designer-calc-folded',
    width: 1600,
    height: 1000,
    prepare: showScale('seed:1002', 'CF · CF'),
  },
  {
    file: 'designer-calc-fn',
    width: 1600,
    height: 1000,
    prepare: showScale('seed:1002', 'sin2 · sin2'),
  },
  {
    file: 'designer-calc-valuefn',
    width: 1600,
    height: 1000,
    prepare: showScale('seed:1002', 'H2 · H2'),
  },
  {
    file: 'designer-calc-linear',
    width: 1600,
    height: 1000,
    prepare: showScale('seed:1002', 'lg · lg'),
  },
  {
    file: 'designer-calc-expr',
    width: 1600,
    height: 1000,
    prepare: showScale('seed:1002', 'C · C', seedExpr),
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
