#!/usr/bin/env bun

/**
 * Load environment variables and run drizzle-kit command
 * This ensures .env.local is loaded before Drizzle runs
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Manually parse and load .env.local
const envLocalPath = join(process.cwd(), '.env.local');
if (existsSync(envLocalPath)) {
  console.log('✅ Loading .env.local');
  const envContent = readFileSync(envLocalPath, 'utf-8');

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').trim();

    if (key && value) {
      process.env[key] = value;
      console.log(`   Loaded: ${key}`);
    }
  });
}

// Get command from arguments
const command = process.argv[2];

if (!command) {
  console.error('❌ Usage: bun run scripts/drizzle.ts [push|generate|migrate|studio]');
  process.exit(1);
}

// Set default DATABASE_URL if not set (SQLite for local development)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:data/local.db';
  console.log('💡 Using default SQLite database: data/local.db');
}

const databaseUrl = process.env.DATABASE_URL;
const isPostgres = databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');
const dbType = isPostgres ? 'PostgreSQL' : 'SQLite';

console.log(`\n🚀 Running drizzle-kit ${command} with ${dbType}...\n`);

try {
  // Run drizzle-kit command with environment variables
  execSync(`drizzle-kit ${command}`, {
    stdio: 'inherit',
    env: { ...process.env },
  });
} catch (error) {
  process.exit(1);
}



