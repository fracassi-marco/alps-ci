import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');

// Helper to clean up config before tests
async function cleanupConfig() {
  try {
    await fs.unlink(CONFIG_PATH);
  } catch (error) {
    // File doesn't exist, that's fine
  }
}

// Helper to ensure data directory exists
async function ensureDataDir() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

test.describe('Onboarding Flow', () => {
  test.beforeEach(async () => {
    await ensureDataDir();
    await cleanupConfig();
  });

  test('should show welcome screen when no builds exist', async ({ page }) => {
    await page.goto('/');

    // Wait for welcome screen
    await expect(page.getByRole('heading', { name: 'Welcome to Alps-CI' })).toBeVisible();

    // Check for key onboarding elements
    await expect(page.getByText('Track Your GitHub Actions Workflows')).toBeVisible();
    await expect(page.getByText('Track Workflows')).toBeVisible();
    await expect(page.getByText('View Statistics')).toBeVisible();
    await expect(page.getByText('Easy Setup')).toBeVisible();

    // Check for getting started steps
    await expect(page.getByText('Create a GitHub Personal Access Token')).toBeVisible();
    await expect(page.getByText('Add Your First Build')).toBeVisible();
    await expect(page.getByText('Monitor Your Workflows')).toBeVisible();

    // Check for Add Build button
    await expect(page.getByRole('button', { name: 'Add Your First Build' })).toBeVisible();
  });

  test('should open add build form when clicking Add Your First Build', async ({ page }) => {
    await page.goto('/');

    // Click the Add Your First Build button
    await page.getByRole('button', { name: 'Add Your First Build' }).click();

    // Form should be visible
    await expect(page.getByRole('heading', { name: 'Add New Build' })).toBeVisible();

    // Check for all form fields
    await expect(page.getByLabel('Build Name')).toBeVisible();
    await expect(page.getByLabel('Organization')).toBeVisible();
    await expect(page.getByLabel('Repository Name')).toBeVisible();
    await expect(page.getByLabel('Personal Access Token (PAT)')).toBeVisible();
    await expect(page.getByLabel('Cache Expiration (minutes)')).toBeVisible();

    // Check for selector fields
    await expect(page.getByText('Selectors')).toBeVisible();
  });

  test('should close form when clicking cancel', async ({ page }) => {
    await page.goto('/');

    // Open form
    await page.getByRole('button', { name: 'Add Your First Build' }).click();
    await expect(page.getByRole('heading', { name: 'Add New Build' })).toBeVisible();

    // Click cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Welcome screen should be visible again
    await expect(page.getByRole('heading', { name: 'Welcome to Alps-CI' })).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/');

    // Open form
    await page.getByRole('button', { name: 'Add Your First Build' }).click();

    // Try to submit without filling fields
    await page.getByRole('button', { name: 'Add Build' }).click();

    // HTML5 validation should prevent submission
    // Check that we're still on the form
    await expect(page.getByRole('heading', { name: 'Add New Build' })).toBeVisible();
  });
});

