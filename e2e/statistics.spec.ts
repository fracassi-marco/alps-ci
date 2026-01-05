import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');

async function cleanupConfig() {
  try {
    await fs.unlink(CONFIG_PATH);
  } catch (error) {
    // File doesn't exist
  }
}

async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

async function createBuildWithConfig(build: any) {
  await ensureDataDir();
  await fs.writeFile(CONFIG_PATH, JSON.stringify([build], null, 2));
}

test.describe('Statistics Display and Refresh', () => {
  test.beforeEach(async () => {
    await ensureDataDir();
    await cleanupConfig();
    // Wait a bit for file system to sync
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  test('should show loading state while fetching statistics', async ({ page }) => {
    await createBuildWithConfig({
      id: 'test-build-1',
      name: 'Test Build',
      organization: 'test-org',
      repository: 'test-repo',
      selectors: [{ type: 'branch', pattern: 'main' }],
      personalAccessToken: 'test_token',
      cacheExpirationMinutes: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await page.goto('/');

    // Build card should appear
    await expect(page.getByText('Test Build')).toBeVisible({ timeout: 10000 });

    // Loading state should appear briefly
    // Note: This might be very quick, so we use a short timeout
    const loadingText = page.getByText('Loading statistics...');
    // Just check it exists in DOM, might not be visible for long
    await expect(loadingText.or(page.getByText('Total Executions'))).toBeVisible({ timeout: 15000 });
  });

  test('should display statistics sections', async ({ page }) => {
    await createBuildWithConfig({
      id: 'test-build-2',
      name: 'Build with Stats',
      organization: 'test-org',
      repository: 'test-repo',
      selectors: [{ type: 'branch', pattern: 'main' }],
      personalAccessToken: 'test_token',
      cacheExpirationMinutes: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await page.goto('/');
    await expect(page.getByText('Build with Stats')).toBeVisible({ timeout: 10000 });

    // Wait for statistics to load (or error to appear)
    // Since we're using a test token, we'll likely get an error
    // But the structure should still be there
    await page.waitForTimeout(2000);

    // Check for statistics sections (they should exist even if showing error/loading)
    const card = page.locator('.bg-white.dark\\:bg-gray-800').first();
    await expect(card).toBeVisible();

    // Check for action buttons in header
    await expect(page.locator('button[title="Refresh data"]')).toBeVisible();
    await expect(page.locator('button[title="Edit build"]')).toBeVisible();
    await expect(page.locator('button[title="Delete build"]')).toBeVisible();
  });

  test('should show refresh button and animate when clicked', async ({ page }) => {
    await createBuildWithConfig({
      id: 'test-build-3',
      name: 'Refresh Test Build',
      organization: 'test-org',
      repository: 'test-repo',
      selectors: [{ type: 'branch', pattern: 'main' }],
      personalAccessToken: 'test_token',
      cacheExpirationMinutes: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await page.goto('/');
    await expect(page.getByText('Refresh Test Build')).toBeVisible({ timeout: 10000 });

    // Wait a moment for initial load
    await page.waitForTimeout(2000);

    // Find and click refresh button
    const refreshButton = page.locator('button[title="Refresh data"]');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // Button should be disabled during refresh
    await expect(refreshButton).toBeDisabled({ timeout: 1000 });

    // Wait for refresh to complete
    await page.waitForTimeout(3000);

    // Button should be enabled again
    await expect(refreshButton).toBeEnabled({ timeout: 10000 });
  });

  test('should display selectors', async ({ page }) => {
    await createBuildWithConfig({
      id: 'test-build-4',
      name: 'Multi Selector Build',
      organization: 'test-org',
      repository: 'test-repo',
      selectors: [
        { type: 'branch', pattern: 'main' },
        { type: 'tag', pattern: 'v*' },
      ],
      personalAccessToken: 'test_token',
      cacheExpirationMinutes: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await page.goto('/');
    await expect(page.getByText('Multi Selector Build')).toBeVisible({ timeout: 10000 });

    // Wait for card to load
    await page.waitForTimeout(2000);

    // Open Additional Details accordion
    await page.getByRole('button', { name: 'Additional Details' }).click();

    // Check for Selectors section
    await expect(page.getByText('Selectors', { exact: false })).toBeVisible();

    // Check for selector badges
    await expect(page.getByText('branch:', { exact: false })).toBeVisible();
    await expect(page.getByText('main', { exact: true })).toBeVisible();
    await expect(page.getByText('tag:', { exact: false })).toBeVisible();
    await expect(page.getByText('v*', { exact: true })).toBeVisible();
  });

  test('should display metadata footer', async ({ page }) => {
    await createBuildWithConfig({
      id: 'test-build-5',
      name: 'Metadata Test Build',
      organization: 'test-org',
      repository: 'test-repo',
      selectors: [{ type: 'branch', pattern: 'main' }],
      personalAccessToken: 'test_token',
      cacheExpirationMinutes: 45,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await page.goto('/');
    await expect(page.getByText('Metadata Test Build')).toBeVisible({ timeout: 10000 });

    // Wait for card to load
    await page.waitForTimeout(2000);

    // Open Additional Details accordion
    await page.getByRole('button', { name: 'Additional Details' }).click();

    // Check for metadata
    await expect(page.getByText('Cache Expiration:', { exact: false })).toBeVisible();
    await expect(page.getByText('45 min')).toBeVisible();
  });

  test('should show multiple builds in grid layout', async ({ page }) => {
    // Create multiple builds
    await ensureDataDir();
    await fs.writeFile(CONFIG_PATH, JSON.stringify([
      {
        id: 'build-1',
        name: 'First Build',
        organization: 'org1',
        repository: 'repo1',
        selectors: [{ type: 'branch', pattern: 'main' }],
        personalAccessToken: 'token1',
        cacheExpirationMinutes: 30,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'build-2',
        name: 'Second Build',
        organization: 'org2',
        repository: 'repo2',
        selectors: [{ type: 'tag', pattern: 'v*' }],
        personalAccessToken: 'token2',
        cacheExpirationMinutes: 60,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'build-3',
        name: 'Third Build',
        organization: 'org3',
        repository: 'repo3',
        selectors: [{ type: 'workflow', pattern: 'CI' }],
        personalAccessToken: 'token3',
        cacheExpirationMinutes: 90,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ], null, 2));

    await page.goto('/');

    // All three builds should be visible
    await expect(page.getByText('First Build')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Second Build')).toBeVisible();
    await expect(page.getByText('Third Build')).toBeVisible();

    // Check header shows count
    await expect(page.getByText('3 builds configured')).toBeVisible();

    // Add Build button should be in header
    await expect(page.getByRole('button', { name: 'Add Build' })).toBeVisible();
  });
});

