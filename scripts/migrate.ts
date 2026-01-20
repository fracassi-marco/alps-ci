import {migrate} from "drizzle-orm/bun-sqlite/migrator";

import {drizzle} from "drizzle-orm/bun-sqlite";
import {Database} from "bun:sqlite";

if (!process.env.DATABASE_URL) {
  console.error('❌ Define DATABASE_URL in environment to run migrations.');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
const sqlite = new Database(databaseUrl.replace('file:', ''));
const db = drizzle(sqlite);
migrate(db, {migrationsFolder: './src/infrastructure/database/migrations'});
