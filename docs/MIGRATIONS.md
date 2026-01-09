# Database Migrations Guide

Alps-CI uses [Drizzle ORM](https://orm.drizzle.team/) for database schema management and migrations.

## Quick Start

### 1. Start the Database

```bash
# Start PostgreSQL in Docker
bun run db:start
```

### 2. Push Schema to Database (Development)

```bash
# Push schema directly to database (no migrations generated)
bun run db:push
```

### 3. Seed Database

```bash
# Insert development seed data
bun run db:seed
```

You're ready to develop! The database has:
- ✅ All tables created
- ✅ Indexes and constraints
- ✅ Seed user: `dev@example.com`
- ✅ Seed tenant: `Development Team`

## Migration Commands

### Push Schema (Development - Recommended)

```bash
# Push schema changes directly without creating migration files
bun run db:push
```

This is the **fastest way** for development. It syncs your schema with the database instantly.

### Generate Migrations (Production)

```bash
# Generate SQL migration files based on schema changes
bun run db:generate
```

This creates migration files in `src/infrastructure/database/migrations/`.

### Apply Migrations (Production)

```bash
# Apply pending migrations to database
bun run db:migrate
```

### Database Studio (GUI)

```bash
# Open Drizzle Studio - a web-based database GUI
bun run db:studio
```

Visit `https://local.drizzle.studio` to browse and edit data.

## Schema Management

The database schema is defined in TypeScript:

```
src/infrastructure/database/
├── schema.ts          # Database schema definition
├── index.ts           # Database client
└── migrations/        # Generated migration files
```

### Schema File Structure

```typescript
// src/infrastructure/database/schema.ts

import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  // ...
});
```

## Making Schema Changes

### 1. Update Schema (Development Flow)

1. Edit `src/infrastructure/database/schema.ts`
2. Push changes: `bun run db:push`
3. Drizzle will show you the changes and ask for confirmation
4. Test your changes

Example:
```typescript
// Add a new field to users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  bio: text('bio'), // NEW FIELD
  // ...
});
```

### 2. Generate Migration (Production Flow)

1. Edit `src/infrastructure/database/schema.ts`
2. Generate migration: `bun run db:generate`
3. Review migration SQL in `src/infrastructure/database/migrations/`
4. Commit migration files to git
5. In production, run: `bun run db:migrate`

## Seeding Data

Edit `scripts/seed-db.ts` to customize seed data:

```typescript
await db.insert(users).values({
  email: 'admin@example.com',
  name: 'Admin User',
  emailVerified: true,
});
```

Run seeding:
```bash
bun run db:seed
```

## Tables Overview

### Authentication Tables
- `users` - User accounts
- `sessions` - Active sessions
- `accounts` - OAuth provider accounts
- `verification_tokens` - Email verification

### Multi-Tenant Tables
- `tenants` - Organizations/companies
- `tenant_members` - User-tenant relationships with roles
- `invitations` - Pending invitations

### Application Tables
- `builds` - Build configurations

## Database Client Usage

```typescript
import { db, users, tenants } from '@/infrastructure/database';
import { eq } from 'drizzle-orm';

// Insert
await db.insert(users).values({
  email: 'user@example.com',
  name: 'John Doe',
});

// Query
const allUsers = await db.select().from(users);

// Query with filter
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, 'user@example.com'));

// Join
const tenantsWithMembers = await db
  .select()
  .from(tenants)
  .leftJoin(tenantMembers, eq(tenants.id, tenantMembers.tenantId));

// Update
await db
  .update(users)
  .set({ name: 'Jane Doe' })
  .where(eq(users.id, userId));

// Delete
await db
  .delete(users)
  .where(eq(users.id, userId));
```

## Migration Files

Generated migrations are SQL files with metadata:

```
src/infrastructure/database/migrations/
├── 0000_initial_schema.sql
├── 0001_add_user_bio.sql
└── meta/
    ├── _journal.json
    └── 0000_snapshot.json
```

### Migration File Example

```sql
-- 0001_add_user_bio.sql
ALTER TABLE "users" ADD COLUMN "bio" text;
```

## Environment Variables

```bash
# Database connection
DATABASE_URL=postgresql://alpsci:alpsci_dev_password@localhost:5432/alpsci
```

## Common Workflows

### Fresh Start (Reset Everything)

```bash
# Stop database and delete all data
bun run db:reset

# Push schema
bun run db:push

# Seed data
bun run db:seed
```

### Add New Table

1. Edit `src/infrastructure/database/schema.ts`:
```typescript
export const newTable = pgTable('new_table', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
});
```

2. Push to database:
```bash
bun run db:push
```

### Modify Existing Table

1. Edit the table definition in schema.ts
2. Push changes:
```bash
bun run db:push
```

Drizzle will show a diff and ask for confirmation.

### Inspect Database

```bash
# Open Drizzle Studio
bun run db:studio

# Or use psql
bun run db:shell
```

## Production Deployment

### Option 1: Migrations (Recommended)

```bash
# Generate migrations
bun run db:generate

# Commit migrations to git
git add src/infrastructure/database/migrations
git commit -m "Add database migrations"

# In production
bun run db:migrate
```

### Option 2: Push (Quick)

```bash
# Push schema directly (use with caution in production)
bun run db:push
```

## Troubleshooting

### Schema out of sync

```bash
# Reset and re-push
bun run db:reset
bun run db:push
bun run db:seed
```

### Migration conflicts

```bash
# Delete migrations folder and regenerate
rm -rf src/infrastructure/database/migrations
bun run db:generate
```

### Connection errors

```bash
# Check database is running
bun run db:status

# View logs
bun run db:logs

# Restart database
bun run db:stop && bun run db:start
```

## Comparison: Drizzle vs SQL Scripts

### Old Approach (init-db.sql)
❌ Manual SQL scripts  
❌ No type safety  
❌ Hard to track changes  
❌ Error-prone  

### New Approach (Drizzle)
✅ TypeScript schema definition  
✅ Full type safety  
✅ Automatic migration generation  
✅ IDE autocompletion  
✅ Built-in query builder  
✅ Visual database studio  

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle Kit Documentation](https://orm.drizzle.team/kit-docs/overview)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

