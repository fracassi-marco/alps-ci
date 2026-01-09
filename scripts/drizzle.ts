#!/usr/bin/env bun

/**
 * Load environment variables and run drizzle-kit command
 * This ensures .env.local is loaded before Drizzle runs
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';

// Load .env.local if it exists
const envLocalPath = join(process.cwd(), '.env.local');
if (existsSync(envLocalPath)) {
  const { config } = await import('dotenv');
  config({ path: envLocalPath });
  console.log('✅ Loaded .env.local');
}

// Get command from arguments
const command = process.argv[2];

if (!command) {
  console.error('❌ Usage: bun run scripts/drizzle.ts [push|generate|migrate|studio]');
  process.exit(1);
}

// Check DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set');
  console.error('💡 Create .env.local with:');
  console.error('   DATABASE_URL=postgresql://alpsci:alpsci_dev_password@localhost:5432/alpsci');
  process.exit(1);
}

console.log(`🚀 Running drizzle-kit ${command}...\n`);

try {
  // Run drizzle-kit command with environment variables
  execSync(`drizzle-kit ${command}`, {
    stdio: 'inherit',
    env: { ...process.env },
  });
} catch (error) {
  process.exit(1);
}

