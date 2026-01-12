# Alps-CI Setup Guide

Complete guide for setting up and running Alps-CI locally or in production.

---

## Quick Start (Local Development)

### Prerequisites
- [Bun](https://bun.sh) 1.0 or later
- Node.js 18+ (for compatibility)
- GitHub Personal Access Token

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/alps-ci.git
cd alps-ci

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env.local

# Generate authentication secret
bun run auth:generate-secret
# Add the generated secret to .env.local as BETTER_AUTH_SECRET

# Push database schema (creates SQLite database with all tables)
bun run db:push

# (Optional) Seed development data
bun run db:seed

# Start development server
bun run dev
```

Visit `http://localhost:3000/auth/register` to create your first account and organization!

**Important**: Authentication is required for all build operations. The first user to register automatically creates a new organization (tenant) and becomes the owner.

---

## Environment Configuration

### Required Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Node Environment
NODE_ENV=development

# Database - SQLite for local (default)
DATABASE_URL=file:data/local.db

# Authentication (generate with: bun run auth:generate-secret)
BETTER_AUTH_SECRET=your-generated-secret-here
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

# Google OAuth (optional - for Google sign-in)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Generate Authentication Secret

```bash
bun run auth:generate-secret
# Or manually:
openssl rand -base64 32
```

---

## Database Setup

### Local Development (SQLite)

Alps-CI uses SQLite by default for local development. The database stores:
- **User accounts & sessions** (authentication)
- **Tenants** (organizations)
- **Team members & invitations** (multi-tenant management)
- **Builds** (CI configuration with tenant isolation)

```bash
# Create/update database schema
bun run db:push

# Generate migration files (for version control)
bun run db:generate

# Apply migrations
bun run db:migrate

# Open Drizzle Studio (database GUI)
bun run db:studio
```

**Database file location**: `data/local.db`

**Important**: All builds are stored in the database and scoped to tenants. The legacy JSON file storage (`data/config.json`) is deprecated.

### Production (PostgreSQL)

For production deployments, PostgreSQL is recommended:

1. **Set up PostgreSQL database** (Supabase, Railway, Neon, etc.)

2. **Update `.env.local`**:
   ```bash
   DATABASE_URL=postgresql://user:password@host:5432/database
   ```

3. **Run migrations**:
   ```bash
   bun run db:push
   # Or use migrations for better control:
   bun run db:generate
   bun run db:migrate
   ```

**Schema auto-detection**: Drizzle automatically detects whether to use SQLite or PostgreSQL based on the `DATABASE_URL`.

---

## Authentication Setup

Alps-CI uses [better-auth](https://better-auth.com) for authentication with support for:
- ✅ Email/Password authentication
- ✅ Google OAuth (optional)
- ✅ Multi-tenant architecture
- ✅ Team invitations

### Email/Password Setup

Email/password authentication works out of the box. Just ensure:
1. `BETTER_AUTH_SECRET` is set in `.env.local`
2. Database is initialized (`bun run db:push`)

### Google OAuth Setup (Optional)

1. **Create Google OAuth App**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Go to Credentials → Create OAuth 2.0 Client ID
   - Set authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

2. **Add credentials to `.env.local`**:
   ```bash
   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

3. **Restart dev server**:
   ```bash
   bun run dev
   ```

Google sign-in button will now appear on login/register pages.

---

## GitHub Personal Access Token

To monitor GitHub Actions workflows, you need a Personal Access Token (PAT):

1. **Generate Token**:
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Click "Generate new token (classic)"
   - Select scopes: `repo`, `workflow`
   - Generate and copy the token

2. **Add to Build**:
   - When creating a build in Alps-CI, paste the token in the "Personal Access Token" field
   - Token is stored in the database per build

**Security Notes**: 
- Each build can use a different token with minimal required permissions
- PATs are stored in the database (plain text currently - encryption recommended for production)
- Only organization members can access builds and their PATs
- Complete tenant isolation ensures no cross-organization data leakage

---

## Running in Production

### Option 1: Docker (Recommended)

```bash
# Build image
docker build -t alps-ci .

# Run with SQLite (volume for persistence)
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -e DATABASE_URL=file:data/local.db \
  -e BETTER_AUTH_SECRET=your-secret \
  -e BETTER_AUTH_URL=https://your-domain.com \
  -e NODE_ENV=production \
  --name alps-ci \
  alps-ci

# Or with PostgreSQL
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:password@host:5432/database \
  -e BETTER_AUTH_SECRET=your-secret \
  -e BETTER_AUTH_URL=https://your-domain.com \
  -e NODE_ENV=production \
  --name alps-ci \
  alps-ci
```

### Option 2: Direct Deployment

```bash
# Install dependencies
bun install --production

# Build for production
bun run build

# Start production server
bun run start
```

### Option 3: Platform-Specific

**Vercel**:
- Connect your GitHub repository
- Set environment variables in dashboard
- Auto-deploys on push

**Railway**:
- Connect repository
- Add PostgreSQL service
- Set environment variables
- Deploy

**Fly.io**:
```bash
fly launch
fly secrets set BETTER_AUTH_SECRET=your-secret
fly secrets set DATABASE_URL=your-postgres-url
fly deploy
```

---

## Database Management

### View Database (Drizzle Studio)

```bash
bun run db:studio
```

Opens a web-based GUI at `http://localhost:4983` to view and edit database records.

### Backup & Restore (SQLite)

**Backup**:
```bash
cp data/local.db data/backups/backup-$(date +%Y%m%d-%H%M%S).db
```

**Restore**:
```bash
cp data/backups/backup-YYYYMMDD-HHMMSS.db data/local.db
```

**Note**: Database backups include all data (users, tenants, builds, etc.). The old JSON-based build backup system has been replaced by database-level backups.

### Migrations

**Generate migration** (after schema changes):
```bash
bun run db:generate
```

**Apply migrations**:
```bash
bun run db:migrate
```

**Reset database** (⚠️ destroys all data):
```bash
rm data/local.db
bun run db:push
```

---

## Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 bun run dev
```

### Database Lock Error

```bash
# Close Drizzle Studio
# Restart dev server
bun run dev
```

### Authentication Issues

1. **Check secret is set**:
   ```bash
   grep BETTER_AUTH_SECRET .env.local
   ```

2. **Regenerate secret**:
   ```bash
   bun run auth:generate-secret
   # Update .env.local
   ```

3. **Clear database** (if corrupted):
   ```bash
   rm data/local.db
   bun run db:push
   ```

### Build Compilation Hangs

```bash
# Clear Next.js cache
rm -rf .next

# Restart
bun run dev
```

---

## Development Workflow

### Code Structure

```
alps-ci/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── components/        # React components
│   └── invite/            # Invitation acceptance
├── src/
│   ├── domain/            # Domain models & validation
│   ├── use-cases/         # Business logic
│   └── infrastructure/    # External dependencies
├── docs/                  # Documentation
└── data/                  # SQLite database & backups
```

### Scripts

```bash
# Development
bun run dev              # Start dev server
bun run build            # Build for production
bun run start            # Start production server

# Database
bun run db:push          # Push schema changes
bun run db:generate      # Generate migrations
bun run db:migrate       # Apply migrations
bun run db:studio        # Open database GUI
bun run db:seed          # Seed dev data

# Testing
bun test                 # Run unit tests
bun run test:e2e         # Run E2E tests

# Linting
bun run lint             # Check code quality

# Authentication
bun run auth:generate-secret  # Generate auth secret
```

---

## Next Steps

After setup:

1. **Register Account**: Visit `http://localhost:3000/auth/register`
2. **Add First Build**: Click "Add Your First Build"
3. **Configure GitHub**: Add your GitHub PAT and select repository
4. **Monitor Workflows**: View statistics and health metrics
5. **Invite Team**: Use "Invite Member" button to add colleagues

---

## Support & Resources

- **Documentation**: See `/docs` folder for detailed guides
- **Issues**: Report bugs on GitHub Issues
- **Contributing**: See `CONTRIBUTING.md`
- **License**: MIT License

---

**Setup complete!** 🎉 Your Alps-CI instance is ready to monitor GitHub Actions workflows.

