# Testing Database Migrations

## Prerequisites

Before testing, ensure you have enough disk space:

```bash
# Check Docker disk usage
docker system df

# Clean up unused Docker resources if needed
docker system prune -a --volumes -f

# Check system disk space
df -h
```

## Testing Steps

### 1. Start Database

```bash
bun run db:start
```

Wait 10 seconds for the database to initialize.

### 2. Push Schema

```bash
bun run db:push
```

You should see:
```
✅ Loaded .env.local
🚀 Running drizzle-kit push...

Using 'pg' driver for database querying
[✓] Pulling schema from database...
[✓] Changes detected...
```

Drizzle will show you the schema changes and ask for confirmation. Type `y` to apply.

### 3. Seed Database

```bash
bun run db:seed
```

Expected output:
```
🌱 Seeding database...

👤 Creating seed user...
   ✅ User created: dev@example.com

🏢 Creating seed tenant...
   ✅ Tenant created: Development Team (development-team)

👥 Creating tenant membership...
   ✅ Tenant membership created (role: owner)

✅ Database seeding completed successfully!
```

### 4. Test Database Connection

```bash
bun run db:test
```

Expected output:
```
🧪 Testing database connection...

📡 Connecting to database...
✅ Connection successful!

👥 Users in database: 1
   - dev@example.com (Dev User)

🏢 Tenants in database: 1
   - Development Team (development-team)

👥 Tenant memberships: 1
   - User 00000000-0000-0000-0000-000000000001 → Tenant 00000000-0000-0000-0000-000000000002 (owner)

✅ Database test completed successfully!
```

### 5. Open Drizzle Studio (Optional)

```bash
bun run db:studio
```

Visit https://local.drizzle.studio to browse the database in a web UI.

### 6. Inspect with psql

```bash
bun run db:shell
```

Then run:
```sql
-- List all tables
\dt

-- View users
SELECT * FROM users;

-- View tenants
SELECT * FROM tenants;

-- View tenant members
SELECT * FROM tenant_members;

-- Exit
\q
```

## Common Issues

### "No space left on device"

```bash
# Clean Docker
docker system prune -a --volumes -f

# Or reset database
bun run db:reset
```

### "Connection refused"

```bash
# Check if database is running
docker ps | grep db

# View logs
bun run db:logs

# Restart
bun run db:stop
bun run db:start
```

### "DATABASE_URL is not set"

```bash
# Ensure .env.local exists
cat .env.local

# If missing, create it
echo 'DATABASE_URL=postgresql://alpsci:alpsci_dev_password@localhost:5432/alpsci' > .env.local
```

## Verify Everything Works

Run this complete test sequence:

```bash
# 1. Reset everything
bun run db:reset

# 2. Wait for database to be ready
sleep 10

# 3. Push schema
bun run db:push
# Type 'y' when prompted

# 4. Seed data
bun run db:seed

# 5. Test connection
bun run db:test

# 6. Check with psql
bun run db:shell
\dt
SELECT * FROM users;
\q
```

If all commands succeed, your database migrations setup is working correctly!

## Next Steps

Once the database is working:
1. ✅ Database setup complete
2. ✅ Migrations system working
3. ✅ Seed data loaded
4. → Continue with Prompt 10.2: Create database repositories
5. → Continue with Prompt 10.3: Implement tenant registration

