/**
 * Database client wrapper that uses the appropriate SQLite implementation:
 * - bun:sqlite when running with Bun directly (scripts)
 * - better-sqlite3 when running with Next.js (Node.js runtime)
 */

import { drizzle as drizzleBetterSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzleBunSqlite } from 'drizzle-orm/bun-sqlite';
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

let db: ReturnType<typeof drizzleBetterSqlite> | ReturnType<typeof drizzleBunSqlite>;

if (isBun) {
  // Use Bun's native SQLite (for scripts run with `bun run`)
  console.log('💾 Using Bun SQLite (bun:sqlite)...');
  const { Database } = require('bun:sqlite');
  const sqlite = new Database(dbPath);
  db = drizzleBunSqlite(sqlite, { schema });
} else {
  // Use better-sqlite3 (for Next.js/Node.js runtime)
  console.log('💾 Using better-sqlite3 (Next.js runtime)...');
  const Database = require('better-sqlite3');
  const sqlite = new Database(dbPath);
  sqlite.pragma('journal_mode = WAL');
  db = drizzleBetterSqlite(sqlite, { schema });
}

export { db };

