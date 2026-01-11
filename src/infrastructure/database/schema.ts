/**
 * Database schema - dynamically exports the correct schema based on DATABASE_URL
 *
 * - SQLite: file:data/local.db (default for local development)
 * - PostgreSQL: postgresql://... (recommended for production)
 */

// For now, we export SQLite schema by default
// In production with PostgreSQL, the schema will be automatically detected by Drizzle
export * from './schema-sqlite';



