# Database Setup Guide

This guide explains how to set up and use the database for Alps-CI development and production.

## Quick Start (Development)

Alps-CI uses **SQLite** by default for local development - no Docker or external database required!

### 1. Push Schema to Database

```bash
# Push schema using Drizzle (creates the database automatically)
bun run db:push
```

This will:
- Create the SQLite database at `data/local.db`
- Create all tables, indexes, and constraints based on the TypeScript schema

### 2. Seed Development Data (Optional)

```bash
# Insert seed data for development
bun run db:seed
```

### 3. Verify Database Setup

```bash
# Test database connection
bun run db:test

# Open Drizzle Studio (GUI)
bun run db:studio
```

### 4. Environment Configuration

The default configuration in `.env.local` uses SQLite:

```bash
DATABASE_URL=file:data/local.db
```

## Database Options

### SQLite (Default - Local Development)

**Advantages:**
- No external dependencies
- Zero configuration
- Perfect for local development
- Fast and lightweight
- File-based (easy to backup/restore)

**Connection String:**
```bash
DATABASE_URL=file:data/local.db
```

### PostgreSQL (Production - Multi-tenant)

**Advantages:**
- Better for production multi-tenant deployments
- Concurrent access
- Advanced features (JSON operations, full-text search)
- Scalable

**Connection String:**
```bash
DATABASE_URL=postgresql://user:password@host:5432/database
```

**Example (Supabase):**
```bash
DATABASE_URL=postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

## Database Schema Management

Alps-CI uses **Drizzle ORM** for schema management and migrations.

See [MIGRATIONS.md](./MIGRATIONS.md) for detailed documentation on:
- Making schema changes
- Generating migrations
- Using Drizzle Studio
- Production deployment

## Database Scripts

```bash
# Push schema changes (recommended for development)
bun run db:push

# Generate migration files
bun run db:generate

# Apply migrations (production)
bun run db:migrate

# Open Drizzle Studio (database GUI)
bun run db:studio

# Seed development data
bun run db:seed

# Test database connection
bun run db:test
```

## Database Schema

The database includes the following tables:

### Authentication Tables (better-auth)
- `users` - User accounts
- `sessions` - User sessions
- `accounts` - OAuth provider accounts
- `verification_tokens` - Email verification tokens

### Multi-Tenant Tables
- `tenants` - Organizations/companies
- `tenant_members` - User-tenant relationships with roles
- `invitations` - Pending tenant invitations

### Application Tables
- `builds` - Build configurations (migrated from config.json)

### Roles
- **owner** - Full access, can delete tenant
- **admin** - Manage builds and invite users
- **member** - Read-only access

## Row Level Security (RLS)

The database uses PostgreSQL Row Level Security to ensure data isolation:
- Users can only access data from tenants they belong to
- RLS policies are enforced at the database level
- No application-level filtering needed

## Seed Data (Development)

```bash
# Run seed script
bun run db:seed
```

The seed data includes:
- **User**: `dev@example.com`
- **Tenant**: `Development Team` (slug: `development-team`)
- **Role**: Owner

To customize seed data, edit `scripts/seed-db.ts`.

## Switching Between SQLite and PostgreSQL

### From SQLite to PostgreSQL

1. Update `.env.local`:
```bash
DATABASE_URL=postgresql://user:password@host:5432/database
```

2. Push schema:
```bash
bun run db:push
```

3. Migrate data (if needed):
```bash
# Export from SQLite
bun run db:studio  # Export data manually

# Import to PostgreSQL
bun run db:seed  # Or import manually
```

### From PostgreSQL to SQLite

1. Update `.env.local`:
```bash
DATABASE_URL=file:data/local.db
```

2. Push schema:
```bash
bun run db:push
```

## Database Tools

### Drizzle Studio (Visual GUI)

```bash
# Open Drizzle Studio
bun run db:studio
```

Access at `https://local.drizzle.studio`

Features:
- Browse all tables
- View and edit data
- Run queries
- Export data

### SQLite CLI

```bash
# Open SQLite database
sqlite3 data/local.db

# List tables
.tables

# Describe table
.schema users

# Run query
SELECT * FROM users;

# Exit
.quit
```

## Backup & Restore

### SQLite Backup

```bash
# Backup (copy the file)
cp data/local.db data/backups/local-$(date +%Y%m%d-%H%M%S).db

# Restore
cp data/backups/local-20260111-120000.db data/local.db
```

### PostgreSQL Backup

```bash
# Backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

## Production Setup

### Recommended: PostgreSQL on Managed Service

For production multi-tenant deployments:

1. **Choose a provider:**
   - Supabase (recommended for simplicity)
   - AWS RDS
   - Google Cloud SQL
   - DigitalOcean Managed Databases
   - Railway

2. **Set DATABASE_URL:**
```bash
DATABASE_URL=postgresql://user:password@host:5432/database
```

3. **Run migrations:**
```bash
bun run db:migrate
```

4. **Enable SSL** (provider-specific)

5. **Set up backups** (automated by provider)

### Alternative: SQLite for Single-Tenant

If deploying for a single team:
- Keep `DATABASE_URL=file:data/local.db`
- Mount `/app/data` volume in Docker
- Set up regular file backups
- Consider using Litestream for replication

## Troubleshooting

### SQLite Database Locked

```bash
# Check for zombie processes
lsof data/local.db

# Remove write-ahead log
rm data/local.db-wal data/local.db-shm
```

### PostgreSQL Connection Issues

```bash
# Test connection
psql $DATABASE_URL -c "SELECT version();"

# Check if server is reachable
pg_isready -d $DATABASE_URL
```

### Schema Out of Sync

```bash
# Reset and push schema
rm data/local.db  # For SQLite
bun run db:push
```

### Migrations Failed

```bash
# Check migration status
bun run db:studio

# Manually fix in Studio, then regenerate
bun run db:generate
```

## Common Commands Cheat Sheet

```bash
# Push schema (development)
bun run db:push

# Generate migrations (production)
bun run db:generate

# Apply migrations
bun run db:migrate

# Seed data
bun run db:seed

# Open Drizzle Studio (GUI)
bun run db:studio

# Test connection
bun run db:test
```

## Next Steps

1. ✅ Set up database (done)
2. ✅ Push schema with Drizzle
3. ✅ Seed development data
4. Create database repositories (see prompt 10.2)
5. Implement tenant registration (see prompt 10.3)
6. Build invitation system (see prompt 10.4)
7. Migrate builds to database (see prompt 10.5)

