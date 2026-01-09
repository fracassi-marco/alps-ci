# Database Setup Guide

This guide explains how to set up and use the local PostgreSQL database for Alps-CI development.

## Quick Start (Development)

### 1. Start the Database

```bash
# Start only the database (for local Next.js development)
docker compose -f docker-compose.dev.yml up -d

# Or use the npm script
bun run db:start
```

### 2. Push Schema to Database

```bash
# Push schema using Drizzle (recommended for development)
bun run db:push
```

This will create all tables, indexes, and constraints based on the TypeScript schema.

### 3. Seed Development Data

```bash
# Insert seed data for development
bun run db:seed
```

### 4. Update .env.local

Add to your `.env.local` file:

```bash
DATABASE_URL=postgresql://alpsci:alpsci_dev_password@localhost:5432/alpsci
```

### 5. Verify Database Setup

```bash
# Check database is running
bun run db:status

# View database logs
bun run db:logs

# Open PostgreSQL shell
bun run db:shell

# Open Drizzle Studio (GUI)
bun run db:studio
```

## Database Schema Management

Alps-CI uses **Drizzle ORM** for schema management and migrations.

See [MIGRATIONS.md](./MIGRATIONS.md) for detailed documentation on:
- Making schema changes
- Generating migrations
- Using Drizzle Studio
- Production deployment

## Database Connection

The database is accessible at:

The database is accessible at:
- **Host**: `localhost`
- **Port**: `5432`
- **Database**: `alpsci`
- **User**: `alpsci`
- **Password**: `alpsci_dev_password`

Connection string:
```
postgresql://alpsci:alpsci_dev_password@localhost:5432/alpsci
```

### 3. Update .env.local

Add to your `.env.local` file:

```bash
DATABASE_URL=postgresql://alpsci:alpsci_dev_password@localhost:5432/alpsci
```

### 4. Verify Database Setup

```bash
# Check database is running
docker compose -f docker-compose.dev.yml ps

# View database logs
docker compose -f docker-compose.dev.yml logs db

# Connect to database with psql
docker compose -f docker-compose.dev.yml exec db psql -U alpsci -d alpsci
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

## Production Setup

### Reset Database

```bash
# Stop and remove containers and volumes
docker compose -f docker-compose.dev.yml down -v

# Or use the script
bun run db:reset

# Push schema again
bun run db:push

# Seed data
bun run db:seed
```

### View Database Tables

```bash
# Using psql
bun run db:shell

# Then in psql:
\dt

# Or use Drizzle Studio (GUI)
bun run db:studio
```

### Run SQL Queries

```bash
# Interactive psql session
docker compose -f docker-compose.dev.yml exec db psql -U alpsci -d alpsci

# Run a query
docker compose -f docker-compose.dev.yml exec db psql -U alpsci -d alpsci -c "SELECT * FROM users;"
```

### Backup Database

```bash
# Create backup
docker compose -f docker-compose.dev.yml exec db pg_dump -U alpsci alpsci > backup.sql

# Restore backup
cat backup.sql | docker compose -f docker-compose.dev.yml exec -T db psql -U alpsci -d alpsci
```

### View Database Logs

```bash
# Follow logs
docker compose -f docker-compose.dev.yml logs -f db

# View recent logs
docker compose -f docker-compose.dev.yml logs --tail=100 db
```

## Migrations

Schema changes are managed with Drizzle ORM:

```bash
# Development: Push schema directly
bun run db:push

# Production: Generate migration files
bun run db:generate

# Apply migrations
bun run db:migrate
```

For detailed migration documentation, see [MIGRATIONS.md](./MIGRATIONS.md).

## Seed Data (Development)

For production:
1. Use a managed PostgreSQL service (AWS RDS, Google Cloud SQL, etc.)
2. Remove seed data from `init-db.sql`
3. Use strong passwords
4. Enable SSL connections
5. Set up regular backups
6. Configure connection pooling

## Troubleshooting

### Database not starting

```bash
# Check logs
docker compose -f docker-compose.dev.yml logs db

# Check if port 5432 is already in use
lsof -i :5432
```

### Connection refused

```bash
# Wait for database to be ready
docker compose -f docker-compose.dev.yml exec db pg_isready -U alpsci

# Check health status
docker compose -f docker-compose.dev.yml ps
```

### Schema not initialized

```bash
# Push schema to database
bun run db:push

# Seed data
bun run db:seed
```

### RLS blocking queries

If you need to bypass RLS for development:
```sql
-- Disable RLS temporarily (not recommended)
ALTER TABLE builds DISABLE ROW LEVEL SECURITY;

-- Or set current user context
SET app.current_user_id = '00000000-0000-0000-0000-000000000001';
```

## Common Commands Cheat Sheet

```bash
# Start database
bun run db:start

# Stop database
bun run db:stop

# Reset database (delete all data)
bun run db:reset

# Push schema
bun run db:push

# Seed data
bun run db:seed

# Open Drizzle Studio (GUI)
bun run db:studio

# Connect to database
bun run db:shell

# View logs
bun run db:logs

# Check status
bun run db:status
```

## Next Steps

1. ✅ Set up database (done)
2. ✅ Push schema with Drizzle
3. ✅ Seed development data
4. Create database repositories (see prompt 10.2)
5. Implement tenant registration (see prompt 10.3)
6. Build invitation system (see prompt 10.4)
7. Migrate builds to database (see prompt 10.5)

