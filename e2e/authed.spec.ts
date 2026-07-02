import { test, expect } from '@playwright/test'

// Authenticated journey — requires a real Supabase backend plus a seeded test
// account. Provide E2E_EMAIL and E2E_PASSWORD (and real NEXT_PUBLIC_SUPABASE_*
// env on the server) to enable; skipped otherwise so the suite stays green in
// credential-less environments (CI without secrets, fresh clones).
const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD

test.describe('authed journey', () => {
  test.skip(!email || !password, 'E2E_EMAIL / E2E_PASSWORD not set')

  test('login → dashboard → trends', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('your@email.com').fill(email!)
    await page.getByPlaceholder('Password').fill(password!)
    await page.getByRole('button', { name: 'Sign in' }).click()

    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    await expect(page.getByText(/snapshot/i)).toBeVisible()

    await page.goto('/trends')
    await expect(page.getByRole('heading', { name: 'Trends' })).toBeVisible()
  })
})
