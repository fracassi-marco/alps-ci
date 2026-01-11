/**
 * Database client wrapper that uses the appropriate SQLite implementation:
 * - bun:sqlite when running with Bun directly (scripts)
 * - better-sqlite3 when running with Next.js (Node.js runtime)
 */

import { drizzle as drizzleBetterSqlite } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { join } from 'path';
import { mkdirSync } from 'fs';

const databaseUrl = process.env.DATABASE_URL || 'file:data/local.db';
const dbPath = databaseUrl.replace('file:', '');
const dbDir = join(process.cwd(), 'data');

// Ensure data directory exists
try {
  mkdirSync(dbDir, { recursive: true });
} catch (error) {
  // Directory already exists
}

// Detect if we're running with Bun or Node.js
const isBun = typeof Bun !== 'undefined';

let db: any;

if (isBun) {
  // Use Bun's native SQLite (for scripts run with `bun run`)
  console.log('💾 Using Bun SQLite (bun:sqlite)...');
  try {
    // Dynamic import to avoid bundler issues
    const { Database } = require('bun:sqlite');
    const { drizzle: drizzleBunSqlite } = require('drizzle-orm/bun-sqlite');
    const sqlite = new Database(dbPath);
    db = drizzleBunSqlite(sqlite, { schema });
  } catch (e) {
    // Fallback to better-sqlite3 if bun:sqlite fails
    console.log('⚠️  bun:sqlite failed, falling back to better-sqlite3');
    const Database = require('better-sqlite3');
    const sqlite = new Database(dbPath);
    sqlite.pragma('journal_mode = WAL');
    db = drizzleBetterSqlite(sqlite, { schema });
  }
} else {
  // Use better-sqlite3 (for Next.js/Node.js runtime)
  console.log('💾 Using better-sqlite3 (Next.js runtime)...');
  const Database = require('better-sqlite3');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  db = drizzleBetterSqlite(sqlite, { schema });
}

export { db };

