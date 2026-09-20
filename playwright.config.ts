import { defineConfig } from '@playwright/test'

// Locally the suite drives the system Microsoft Edge (`channel: 'msedge'`), so
// no browser is downloaded. CI runners have no Edge, so they fall back to
// Playwright's bundled Chromium (`npx playwright install chromium`). Override
// with `PW_CHANNEL` when needed. It reuses a running dev server when there is one.
const channel = process.env.PW_CHANNEL ?? (process.env.CI ? undefined : 'msedge')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    channel,
    headless: true,
    testIdAttribute: 'data-test',
    viewport: { width: 1600, height: 900 },
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { ...(process.env as Record<string, string>), BROWSER: 'none' },
  },
})
