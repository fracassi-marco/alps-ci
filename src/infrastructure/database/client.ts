/**
 * Database client using Bun's native SQLite implementation (bun:sqlite).
 *
 * Uses singleton pattern with globalThis to persist across Next.js HMR reloads.
 * Requires running with: bun --bun dev (or bunfig.toml with bun = true)
 */

import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";
import { join } from 'path';
import { mkdirSync } from 'fs';

type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

// Store singleton in globalThis to persist across HMR reloads in development
declare global {
  var __db: DrizzleDB | undefined;
}

/**
 * Initialize and return the database client.
 * This function is idempotent - calling it multiple times returns the same instance.
 */
function initializeDatabase(): DrizzleDB {
  // Return existing instance if already initialized (persists across HMR)
  if (globalThis.__db) {
    return globalThis.__db;
  }

  const databaseUrl = process.env.DATABASE_URL || 'file:data/local.db';
  const dbPath = databaseUrl.replace('file:', '');
  const dbDir = join(process.cwd(), 'data');

  // Ensure data directory exists
  try {
    mkdirSync(dbDir, { recursive: true });
  } catch (error) {
    // Directory already exists
  }

  console.log('💾 Initializing Bun SQLite (bun:sqlite)...');
  const sqlite = new Database(dbPath);
  const dbInstance = drizzle(sqlite, { schema });

  // Store in globalThis to survive HMR reloads in development
  globalThis.__db = dbInstance;
  return dbInstance;
}

// Initialize once and export the singleton instance
export const db = initializeDatabase();
