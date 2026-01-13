# Alps-CI 🏔️

A modern multi-tenant CI dashboard that displays GitHub Actions workflows with real-time statistics, health monitoring, and comprehensive build tracking.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-16+-black.svg)

---

## 🌟 Features

### 👥 Multi-Tenant Architecture
- **Team Workspaces** - Each company gets its own isolated tenant
- **User Authentication** - Email/password and Google OAuth support
- **Team Invitations** - Invite colleagues to join your workspace
- **Role-Based Access** - Owner, admin, and member roles

### 📊 Comprehensive Statistics
- **Workflow Execution Tracking** - Monitor runs from the last 7 days
- **Success/Failure Metrics** - Detailed breakdown of build results
- **Health Badge** - Color-coded health indicators
- **7-Day Success Chart** - Visual stacked bar chart
- **Recent Runs** - Links to the last 3 workflow executions
- **Repository Insights** - Commits, contributors, and last commit details
- **Grid & List Views** - Toggle between detailed card layout or compact table view
  - Grid view shows full statistics with charts and detailed metrics
  - List view displays builds in a compact table with key metrics at a glance
  - View preference persists in browser localStorage

### 🎯 Smart Filtering
- **Multiple Selectors** - Filter by branch, tag, or workflow name
- **Wildcard Support** - Use patterns like `v*`, `v1.*`, `main`
- **AND Logic** - Combine branch + tag for precise filtering

### ⚡ Performance
- **Intelligent Caching** - Configurable cache expiration per Build (1-1440 minutes)
- **Manual Refresh** - On-demand statistics updates
- **Real-time Updates** - Instant UI feedback

---

## 🚀 Quick Start

```bash
# Clone and install
git clone https://github.com/yourusername/alps-ci.git
cd alps-ci
bun install

# Setup environment
cp .env.example .env.local
bun run auth:generate-secret
# Add generated secret to .env.local

# Initialize database
bun run db:push

# Start development server
bun run dev
```

Visit `http://localhost:3000` and register your first account!

📚 **For detailed setup instructions**, see [SETUP.md](./SETUP.md)

---
bun run db:seed

# Open Drizzle Studio (database GUI)
bun run db:studio
```

See [docs/MIGRATIONS.md](docs/MIGRATIONS.md) for schema management and [docs/DATABASE_SETUP.md](docs/DATABASE_SETUP.md) for detailed database documentation.

### Using Docker

```bash
# Build the image
docker build -t alps-ci .

# Run the container
docker run -p 3000:3000 -v $(pwd)/data:/app/data alps-ci
```

The `-v` flag mounts the data directory to persist your configuration.

---

## 📖 Usage

### 1. Register Your Account

1. Visit `http://localhost:3000/auth/register`
2. Fill in the registration form:
   - **Your Name**: Your full name
   - **Email Address**: Your email
   - **Password**: Minimum 8 characters
   - **Company Name**: Your organization's name (creates a tenant)
3. Click **"Create account"** to register
4. You'll be automatically signed in and redirected to your dashboard

### 2. Sign In (Returning Users)

## 📖 Usage

### 1. Register Your Account
Visit `http://localhost:3000/auth/register` and create your company account.

### 2. Add Your First Build
1. Get a GitHub Personal Access Token (Settings → Developer settings → PAT with `repo` + `workflow` scopes)
2. Click "Add Your First Build"
3. Configure:
   - Build name, organization, repository
   - Selectors (branch/tag patterns like `main`, `v*`)
   - Your GitHub PAT
   - Cache expiration (minutes)

### 3. Monitor Your Workflows
View real-time statistics, health metrics, and execution history on your dashboard. Switch between grid and list views using the toggle button in the header.

### 4. Invite Your Team
Click "Invite Member" to add colleagues. They'll receive an email to join your workspace.

---

## 🏗️ Architecture

Alps-CI follows **Clean Architecture** with strict separation of concerns:

```
app/              → Next.js UI & API routes
src/domain/       → Pure business logic
src/use-cases/    → Application orchestration
src/infrastructure/ → External dependencies (GitHub API, DB, Cache)
```

For details, see [SETUP.md](./SETUP.md) and [docs/](./docs/)

---

## 🧪 Testing

```bash
bun test              # Unit tests
bun run test:e2e     # E2E tests (local only)
```

**Note**: E2E tests are for local development only and not run in CI.

---

# Watch browser execution
bun run test:e2e:headed

# Debug mode
bun run test:e2e:debug
```

### Test Coverage
- **Domain Layer**: 100%
- **Use-Cases**: 100%
- **Repository**: 100%
- **E2E User Flows**: Onboarding & Statistics (local only)

**Total: 294 unit tests (CI) + E2E tests (local)**

---

## 🎯 Selector Logic

### Single Selector
Shows all workflows matching that selector (OR logic).

### Multiple Selectors (Same Type)
Shows workflows matching any selector (OR logic).

**Example:**
```json
{ "type": "tag", "pattern": "v1.*" },
{ "type": "tag", "pattern": "v2.*" }
```
Shows runs from v1.* OR v2.*

### Branch + Tag Combination
Shows only tag runs (AND logic - tags are created from branches).

**Example:**
```json
{ "type": "branch", "pattern": "main" },
{ "type": "tag", "pattern": "v*" }
```
Shows only tag runs (v*) - these represent main branch commits that were tagged.

### Wildcard Patterns
- `*` - Match any characters
- `?` - Match single character
- Case-insensitive

**Examples:**
- `v*` → v1.0.0, v2.3.4, version-1
- `v1.*` → v1.0, v1.2.3 (not v2.0)
- `release-?` → release-1, release-a (not release-10)

---

## 📊 View Modes

Alps-CI offers two view modes to suit different workflow preferences:

### Grid View (Default)
Displays builds as full-screen cards with comprehensive details:
- Complete statistics (executions, successes, failures)
- Health badge with percentage
- Last repository tag
- 7-day stacked bar chart (successes and failures)
- Last 3 workflow run links
- Repository insights (commits, contributors)
- Last commit details
- Collapsible accordions for detailed metadata

### List View
Displays builds in a compact table format with expandable rows:
- **Collapsed**: Shows key metrics at a glance (name, health, stats, last tag, last run)
- **Expanded**: Click to reveal full details including:
  - 7-day stacked bar chart (successes and failures)
  - Last 3 workflow run links
  - Repository insights (commits, contributors)
  - Last commit details
  - Configured selectors
- **Actions**: Icon-only buttons (Expand, Refresh, Edit, Delete)

### Switching Views
Click the view toggle button in the dashboard header:
- Grid icon (⊞) switches to list view
- List icon (☰) switches to grid view
- Your preference is saved automatically in browser localStorage
- Persists across sessions and page reloads

---

## 🚢 Deployment

### Docker Deployment

1. **Build the image:**
```bash
docker build -t alps-ci .
```

2. **Run the container:**
```bash
docker run -d \
  -p 3000:3000 \
  -v /path/to/data:/app/data \
  --name alps-ci \
  alps-ci
```

3. **Update the image:**
```bash
docker stop alps-ci
docker rm alps-ci
docker pull yourusername/alps-ci:latest
# Run with new image
```

### Environment Variables

- `NODE_ENV` - Set to `production` for production builds
- `PORT` - Server port (default: 3000)

### Docker Compose

```yaml
version: '3.8'
services:
  alps-ci:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

---
## 🔒 Security

- ✅ Passwords hashed with bcrypt
- ✅ Session-based authentication (better-auth)
- ✅ Multi-tenant data isolation
- ✅ Role-based access control
- ⚠️ GitHub tokens stored in database (use PostgreSQL + encryption for production)

**Best Practices**:
- Use strong passwords (8+ characters)
- Enable 2FA on GitHub
- Limit PAT scope to minimum required
- Use PostgreSQL in production

---

## 🛠️ Development

### Tech Stack
- **Runtime**: Bun
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Database**: Drizzle ORM (SQLite/PostgreSQL)
- **Auth**: better-auth
- **Testing**: Bun Test + Playwright

### Available Scripts

```bash
bun run dev          # Start dev server
bun run build        # Production build
bun run start        # Start production server
bun test             # Unit tests
bun run test:e2e     # E2E tests
bun run lint         # ESLint check
bun run db:studio    # Open database GUI
```

---

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Use [gitmoji](https://gitmoji.dev/) for commits (max 128 chars)
4. Open a Pull Request

See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

---

## 📚 Documentation

- [SETUP.md](./SETUP.md) - Complete setup guide
- [docs/AUTH_SETUP.md](./docs/AUTH_SETUP.md) - Authentication details
- [docs/DATABASE_SETUP.md](./docs/DATABASE_SETUP.md) - Database configuration
- [docs/MIGRATIONS.md](./docs/MIGRATIONS.md) - Database migrations
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Contribution guidelines

---

**Made with ❤️ using Clean Architecture principles**


