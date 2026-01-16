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

const Database = require('bun:sqlite').Database;

export const auth = betterAuth({
  database: new Database(dbPath),
  trustedOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  ],
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    // Use snake_case for column names to match our schema
    generateId: () => crypto.randomUUID(),
    crossSubDomainCookies: {
      enabled: true,
    },
  },
  // Custom table names to match our schema (plural forms)
  user: {
    modelName: "users",
    fields: {
      email: "email",
      emailVerified: "email_verified",
      name: "name",
      image: "image",
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  },
  session: {
    modelName: "sessions",
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
    fields: {
      userId: "user_id",
      expiresAt: "expires_at",
      token: "token",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  },
  account: {
    modelName: "accounts",
    accountId: {
      fieldName: "account_id",
    },
    fields: {
      userId: "user_id",
      accountId: "account_id",
      providerId: "provider_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      expiresAt: "expires_at",
      password: "password",
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    },
  },
  secret: process.env.BETTER_AUTH_SECRET || 'default-secret-change-in-production',
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
});

export type Session = typeof auth.$Infer.Session;



