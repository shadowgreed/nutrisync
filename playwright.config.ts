import { defineConfig, devices } from '@playwright/test'

// E2E smoke suite. Runs against a production build (`next build` first) with no
// Supabase credentials required: the unauthenticated specs verify public pages
// render and protected routes redirect to /login. The authed journey spec is
// skipped unless E2E_EMAIL / E2E_PASSWORD (and real Supabase env) are provided.
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    // Sandboxed dev environments ship a system chromium instead of the
    // playwright-managed download; point at it via CHROMIUM_PATH. CI and local
    // machines that ran `npx playwright install` leave this unset.
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000/login',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
