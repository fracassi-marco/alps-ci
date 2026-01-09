import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://placeholder';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infrastructure/database/schema.ts',
  out: './src/infrastructure/database/migrations',
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
});

