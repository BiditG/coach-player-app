/**
 * Seed file for Playwright Agents.
 * This file establishes the initialization context (fixtures, auth state, base URL)
 * that the Planner and Generator agents use to understand your app.
 *
 * Run: npx playwright init-agents --loop=claude
 */
import { test, expect } from '@playwright/test';

test.describe('seed for guest user', () => {
  test('seed: homepage loads', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);
  });
});

test.describe('seed for authenticated user', () => {
  // NOTE: this seed does not perform a real login. Configure Supabase auth
  // storageState (https://playwright.dev/docs/auth) before using this seed
  // to drive Planner/Generator agents against authenticated-only pages.
  test('seed: login form is ready to be filled in', async ({ page }) => {
    await page.goto('/login');
    // Fill Supabase auth form — adapt to your setup
    // await page.getByLabel('Email').fill('test@example.com');
    // await page.getByLabel('Password').fill('password');
    // await page.getByRole('button', { name: 'Sign in' }).click();
    // await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });
});
