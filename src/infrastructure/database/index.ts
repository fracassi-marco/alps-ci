import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';
import { join } from 'path';
import { mkdirSync } from 'fs';

const databaseUrl = process.env.DATABASE_URL || 'file:data/local.db';

// SQLite connection for local development
console.log('💾 Using SQLite database...');
const dbPath = databaseUrl.replace('file:', '');
const dbDir = join(process.cwd(), 'data');

// Ensure data directory exists
try {
  mkdirSync(dbDir, { recursive: true });
} catch (error) {
  // Directory already exists
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL'); // Better performance

const db = drizzle(sqlite, { schema });

// Export database instance
export { db };

// Export schema for use in queries
export * from './schema';





