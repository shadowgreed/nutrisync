import { test, expect } from '@playwright/test'

// Spanish (es-419) language support: the pre-auth surfaces must fully render in
// Spanish when the preference cookie is set, and the picker must switch live.

test.describe('Spanish locale', () => {
  test('login page renders in Spanish with the es cookie', async ({ page, context }) => {
    await context.addCookies([{ name: 'nutrisync_locale', value: 'es', url: 'http://localhost:3000' }])
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
    await expect(page.getByPlaceholder('tu@correo.com')).toBeVisible()
    await expect(page.getByPlaceholder('Contraseña')).toBeVisible()
    await expect(page.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toBeVisible()
    // <html lang> carries the LatAm tag
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-419')
  })

  test('language picker switches the page from English to Spanish', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
    await page.getByRole('button', { name: 'Español' }).click()
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible()
    // and back
    await page.getByRole('button', { name: 'English' }).click()
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible()
  })

  test('forgot-password renders in Spanish with the es cookie', async ({ page, context }) => {
    await context.addCookies([{ name: 'nutrisync_locale', value: 'es', url: 'http://localhost:3000' }])
    await page.goto('/forgot-password')
    await expect(page.getByRole('heading', { name: 'Restablece tu contraseña' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enviar enlace' })).toBeVisible()
  })
})
