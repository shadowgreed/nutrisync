import { test, expect } from '@playwright/test'

// Unauthenticated smoke: public surfaces render, protected surfaces redirect.
// Needs no Supabase credentials — with placeholder env the auth check simply
// yields "no user", which is exactly the state these specs assert.

test.describe('public pages render', () => {
  test('login page shows the sign-in form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'NutriSync' })).toBeVisible()
    await expect(page.getByPlaceholder('your@email.com')).toBeVisible()
    await expect(page.getByPlaceholder('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('login links to password recovery', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('link', { name: 'Forgot password?' })).toBeVisible()
  })

  test('forgot-password page renders', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible()
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
  })

  test('privacy and terms are public', async ({ page }) => {
    await page.goto('/privacy')
    await expect(page.getByText(/privacy/i).first()).toBeVisible()
    await page.goto('/terms')
    await expect(page.getByText(/terms/i).first()).toBeVisible()
  })
})

test.describe('protected routes are gated', () => {
  for (const path of ['/dashboard', '/feed', '/trends', '/weekly', '/settings']) {
    test(`${path} redirects unauthenticated visitors to /login`, async ({ page }) => {
      await page.goto(path)
      await page.waitForURL(/\/login/)
      await expect(page).toHaveURL(/\/login/)
    })
  }
})
