import { betterAuth } from "better-auth";
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';

const databaseUrl = process.env.DATABASE_URL || 'file:data/local.db';
const dbPath = databaseUrl.replace('file:', '');

// Ensure data directory exists
try {
  const dbDir = dirname(join(process.cwd(), dbPath));
  mkdirSync(dbDir, { recursive: true });
} catch (error) {
  // Directory already exists
}

// Detect if we're running with Bun or Node.js
const isBun = typeof Bun !== 'undefined';

// Use appropriate SQLite implementation
const Database = isBun
  ? require('bun:sqlite').Database
  : require('better-sqlite3');

export const auth = betterAuth({
  database: new Database(dbPath),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Set to true in production with email service
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  secret: process.env.BETTER_AUTH_SECRET || 'default-secret-change-in-production',
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});

export type Session = typeof auth.$Infer.Session;



