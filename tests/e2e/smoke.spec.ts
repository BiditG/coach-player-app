import { test, expect } from '@playwright/test';

test.describe('Smoke tests', () => {
  test('homepage loads', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/.+/);
  });

  test('login page loads', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBe(200);
  });

  test('signup page loads', async ({ page }) => {
    const response = await page.goto('/signup');
    expect(response?.status()).toBe(200);
  });

  test('health endpoint responds', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});

test.describe('Navigation', () => {
  test('homepage has login link', async ({ page }) => {
    await page.goto('/');
    const loginLink = page.locator('a[href*="login"]').first();
    await expect(loginLink).toBeVisible();
  });

  test('login page has signup link', async ({ page }) => {
    await page.goto('/login');
    const signupLink = page.locator('a[href*="signup"]').first();
    await expect(signupLink).toBeVisible();
  });
});

test.describe('Auth guard', () => {
  test('dashboard redirects unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard');
    // Should redirect to login
    await page.waitForURL(/\/(login|signin)/);
  });
});
