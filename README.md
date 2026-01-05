# Alps-CI 🏔️

A modern CI dashboard that displays GitHub Actions workflows with real-time statistics, health monitoring, and comprehensive build tracking.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15+-black.svg)
![Tests](https://img.shields.io/badge/tests-199%20unit%20tests-green.svg)

---

## 🌟 Features

### 📊 Comprehensive Statistics
- **Workflow Execution Tracking** - Monitor runs from the last 7 days
- **Success/Failure Metrics** - Detailed breakdown of build results
- **Health Badge** - Color-coded health indicators (green/yellow/red)
- **7-Day Success Chart** - Visual bar chart showing daily trends
- **Recent Runs** - Links to the last 3 workflow executions

### 🎯 Smart Filtering
- **Multiple Selectors** - Filter by branch, tag, or workflow name
- **Wildcard Support** - Use patterns like `v*`, `v1.*`, `main`
- **AND Logic** - Combine branch + tag for precise filtering
- **Flexible Configuration** - Mix and match selector types

### ⚡ Performance
- **Intelligent Caching** - Configurable cache expiration per Build
- **Manual Refresh** - On-demand statistics updates
- **Auto-backup** - Automatic config backups before deletions
- **Real-time Updates** - Instant UI feedback on all operations

### 🎨 Modern UI
- **Dark Mode** - Full dark mode support
- **Responsive Design** - Works on all screen sizes
- **Beautiful Cards** - Clean, organized build display
- **Interactive Forms** - Intuitive add/edit workflows
- **Error Recovery** - Clear error messages with actionable CTAs

---

## 🚀 Quick Start

### Prerequisites
- [Bun](https://bun.sh) 1.0 or later
- Node.js 18+ (for compatibility)
- GitHub Personal Access Token (PAT)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/alps-ci.git
cd alps-ci

# Install dependencies
bun install

# Run development server
bun run dev
```

Visit `http://localhost:3000` to see the application.

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

### 1. Create a GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Generate a new token (classic)
3. Select scopes: `repo`, `workflow`
4. Copy the token (you won't see it again!)

### 2. Add Your First Build

1. Click **"Add Your First Build"** on the welcome screen
2. Fill in the form:
   - **Build Name**: Descriptive name (e.g., "Production Release")
   - **Organization**: GitHub org name
   - **Repository**: Repository name
   - **Selectors**: One or more filters (branch/tag/workflow)
   - **Personal Access Token**: Your GitHub PAT
   - **Cache Expiration**: How long to cache data (1-1440 minutes)

3. Click **"Add Build"** to save

### 3. View Statistics

Once created, your Build card will display:
- Total, successful, and failed execution counts
- Health percentage with color-coded badge
- Latest repository tag
- 7-day success trend chart
- Links to recent workflow runs
- Selectors and metadata

### 4. Manage Builds

- **Edit**: Click the edit icon to update configuration
- **Delete**: Click the delete icon (confirmation + auto-backup)
- **Refresh**: Click the refresh icon for fresh data

---

## 🏗️ Architecture

Alps-CI follows **Clean Architecture** principles:

```
┌─────────────────────────────────────────┐
│              UI Layer                    │
│  (React, Next.js, TailwindCSS)          │
└───────────────┬─────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────┐
│         Use-Cases Layer                  │
│  (Business logic, orchestration)        │
└───────────────┬─────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────┐
│      Infrastructure Layer                │
│  (GitHub API, FileSystem, Cache)        │
└───────────────┬─────────────────────────┘
                │
                ↓
┌─────────────────────────────────────────┐
│         Domain Layer                     │
│  (Models, validation, pure logic)       │
└─────────────────────────────────────────┘
```

### Directory Structure

```
alps-ci/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── components/        # React components
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── src/
│   ├── domain/            # Domain models & validation
│   ├── use-cases/         # Business logic
│   └── infrastructure/    # External dependencies
├── e2e/                   # End-to-end tests
├── data/                  # Config & backups (gitignored)
├── Dockerfile             # Docker configuration
└── playwright.config.ts   # E2E test configuration
```

---

## 🔧 Configuration

### Config File Location
`data/config.json`

### Config Structure
```json
[
  {
    "id": "unique-id",
    "name": "Build Name",
    "organization": "github-org",
    "repository": "repo-name",
    "selectors": [
      { "type": "branch", "pattern": "main" },
      { "type": "tag", "pattern": "v*" }
    ],
    "personalAccessToken": "ghp_...",
    "cacheExpirationMinutes": 30,
    "createdAt": "2026-01-05T10:00:00.000Z",
    "updatedAt": "2026-01-05T10:00:00.000Z"
  }
]
```

### Backups
Automatic backups are created before every deletion:
- Location: `data/backups/`
- Format: `config_YYYY-MM-DDTHH-MM-SS-SSSZ.json`
- Restoration: Manual (copy backup to `config.json`)

---

## 🧪 Testing

### Unit Tests (199 tests)
```bash
# Run all unit tests
bun test

# Watch mode
bun run test:watch
```

### End-to-End Tests (2 test files)
```bash
# Run e2e tests (headless)
bun run test:e2e

# Interactive UI mode
bun run test:e2e:ui

# Watch browser execution
bun run test:e2e:headed

# Debug mode
bun run test:e2e:debug
```

### Test Coverage
- **Domain Layer**: 100%
- **Use-Cases**: 100%
- **Repository**: 100%
- **E2E User Flows**: Onboarding & Statistics

**Total: 199 unit tests + E2E tests**

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

### Personal Access Tokens
- Tokens are stored in plain text in `config.json`
- **Keep `data/` directory secure**
- Add `data/` to `.gitignore` (already configured)
- Use minimal required permissions (repo, workflow)
- Rotate tokens regularly

### Best Practices
- **Don't commit** `data/config.json` to version control
- **Use environment-specific** tokens (dev vs prod)
- **Limit token scope** to only what's needed
- **Monitor token usage** in GitHub settings
- **Revoke tokens** immediately if compromised

---

## 🛠️ Development

### Tech Stack
- **Runtime**: Bun 1.0+
- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript 5.0+
- **Styling**: TailwindCSS 3.4+
- **Testing**: Bun Test + Playwright
- **Icons**: Lucide React

### Scripts

```bash
# Development
bun run dev          # Start dev server

# Building
bun run build        # Production build
bun run start        # Start production server

# Testing
bun test             # Unit tests
bun run test:watch   # Unit tests (watch mode)
bun run test:e2e     # E2E tests

# Linting
bun run lint         # ESLint check
```

### Code Style
- **Clean Architecture** - Separation of concerns
- **TypeScript** - Strict mode enabled
- **ESLint** - Configured for Next.js
- **Gitmoji** - Semantic commit messages
- **Tests** - TDD approach with high coverage

---

## 📝 API Endpoints

### Builds
- `GET /api/builds` - List all builds
- `POST /api/builds` - Create new build
- `PUT /api/builds/[id]` - Update build
- `DELETE /api/builds/[id]` - Delete build (with backup)

### Statistics
- `GET /api/builds/[id]/stats` - Fetch statistics (cached)
- `POST /api/builds/[id]/stats` - Manual refresh (invalidate cache)

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** with gitmoji (`git commit -m '✨ Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Commit Convention
Use [gitmoji](https://gitmoji.dev/) for semantic commits:
- ✨ `:sparkles:` - New feature
- 🐛 `:bug:` - Bug fix
- 📝 `:memo:` - Documentation
- 🎨 `:art:` - UI/styling
- ♻️ `:recycle:` - Refactoring
- ✅ `:white_check_mark:` - Tests
- 🔧 `:wrench:` - Configuration

**Keep commit messages under 128 characters.**

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

## 🙏 Acknowledgments

- **Next.js** - The React Framework
- **TailwindCSS** - Utility-first CSS framework
- **Lucide** - Beautiful open-source icons
- **Playwright** - Reliable end-to-end testing
- **Bun** - Fast JavaScript runtime

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/alps-ci/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/alps-ci/discussions)
- **Documentation**: This README + inline code comments

---

## 🗺️ Roadmap

- [ ] Export statistics to CSV/JSON
- [ ] Email notifications for build failures
- [ ] Slack/Discord webhooks
- [ ] Multi-repository dashboards
- [ ] Trend analysis and insights
- [ ] Custom health thresholds
- [ ] Build templates

---

**Made with ❤️ using Clean Architecture principles**

Visit [Alps-CI Documentation](https://github.com/yourusername/alps-ci) for more details.

