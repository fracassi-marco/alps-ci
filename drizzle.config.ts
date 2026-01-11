import { defineConfig } from 'drizzle-kit';

// Determine database type from DATABASE_URL or default to SQLite
const databaseUrl = process.env.DATABASE_URL || 'file:data/local.db';
const isPostgres = databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://');

// Export configuration based on database type
export default isPostgres
  ? defineConfig({
      dialect: 'postgresql',
      schema: './src/infrastructure/database/schema-postgres.ts',
      out: './src/infrastructure/database/migrations',
      dbCredentials: {
        url: databaseUrl,
      },
      verbose: true,
      strict: true,
    })
  : defineConfig({
      dialect: 'sqlite',
      schema: './src/infrastructure/database/schema-sqlite.ts',
      out: './src/infrastructure/database/migrations',
      dbCredentials: {
        url: databaseUrl.replace('file:', ''),
      },
      verbose: true,
      strict: true,
    });

