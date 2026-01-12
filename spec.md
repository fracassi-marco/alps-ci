# Alps-CI Specification

## Overview
Alps-CI is a modern multi-tenant CI dashboard that displays workflows from GitHub Actions for multiple repositories, organized as "Builds". The system supports team collaboration with user authentication, role-based access control, and team invitations. Users can define Builds with custom Selectors and view comprehensive statistics and metadata. The project uses Bun, Next.js (App Router), TypeScript, TailwindCSS, better-auth, and Drizzle ORM, following Clean Architecture principles. Data is retrieved from GitHub via the GraphQL API and cached per Build. Configuration is stored in a database (SQLite for development, PostgreSQL for production).

---

## Key Concepts

### Build
A set of workflows executed in a specific repository, identified by user-defined Selectors. Each Build belongs to a specific tenant and displays comprehensive statistics and health metrics.

### Selector
A filter for workflows, which can be:
- **Git tag pattern** (e.g., `v*`, `v1.*`, `vX.Y.Z`)
- **Git branch** (e.g., `main`, `develop`)
- **Workflow name** (e.g., `CI-Workflow`)

Selectors are entered as custom patterns or free text and can be mixed within a Build.

### Selector Logic
All selectors use **OR logic** (union) - a workflow run is included if it matches **ANY** of the configured selectors:
- **Single selector**: Shows runs matching that selector
- **Multiple selectors of same type**: Shows runs matching any of them (e.g., `main` OR `develop`)
- **Mixed selector types**: Shows runs matching any selector (e.g., branch `main` OR tag `v*` OR workflow `CI`)
- **Branch + Tag combination**: Shows runs matching the branch OR runs matching the tag pattern

**Example**: If you configure selectors `[branch: main, tag: v*]`, the dashboard will show:
- All runs from the `main` branch, PLUS
- All runs from tags matching `v*` pattern

This allows flexible monitoring of multiple branches, tags, and workflows in a single Build.

### Tenant
An isolated workspace for a company/organization. Each tenant has:
- Unique identifier and slug
- Multiple users (members)
- Private builds and data
- Complete data isolation from other tenants

### User Roles
- **Owner**: Full access, can manage all builds, invite members
- **Admin**: Can manage builds and invite members
- **Member**: Can view builds and statistics

---

## Authentication & Multi-Tenancy

### User Registration
- Email/password authentication
- Optional Google OAuth
- First user creates a tenant (company)
- User becomes tenant owner
- Passwords hashed with bcrypt
- Sessions managed by better-auth

### Sign In
- Email/password or Google OAuth
- Session-based authentication
- Secure cookie management
- Auto-redirect to tenant dashboard

### Team Invitations
- Owners/Admins can invite colleagues via email
- Invitation contains unique token with expiration (7 days)
- Invited users can:
  - Sign in if they have an account
  - Register a new account (no company field shown)
- After auth, invitation is automatically accepted
- User joins the existing tenant (no new tenant created)
- Role assigned based on invitation (owner/admin/member)

### Session Management
- 7-day session expiration
- Automatic session refresh
- Secure cookie-based sessions
- Tenant context loaded on dashboard

---

## User Experience

### First-Time Users (Registration)
1. Visit registration page
2. Enter: name, email, password, company name
3. Account created + tenant created
4. Automatic sign-in
5. Redirect to empty dashboard with welcome screen

### Invited Users
1. Receive invitation email with token link
2. Click link → Redirect to sign-in page with invite token
3. Options:
   - **Existing users**: Sign in → Accept invitation → Join team
   - **New users**: Register (no company field) → Accept invitation → Join team
4. After acceptance, redirect to team dashboard

### Dashboard
- Welcome screen when no Builds exist (with onboarding instructions)
- "Add Your First Build" button
- "Invite Member" button (owner/admin only)
- User menu with sign out option
- List of all Builds as cards

### Build Management
When adding a Build, specify:
- **Name**: Descriptive name
- **Organization**: GitHub org name
- **Repository**: Repository name
- **Selectors**: One or more filters (mixed types allowed)
- **Personal Access Token**: GitHub PAT
- **Cache Expiration**: 1-1440 minutes

Actions:
- **Add**: Create new Build
- **Edit**: Update configuration (triggers immediate refresh)
- **Delete**: Confirmation required, creates backup
- **Refresh**: Manual refresh button for fresh statistics

---

---

## Build Card UI

Each Build appears as a full-screen card with comprehensive statistics:

### Core Metrics
- **Total Executions**: Number of workflow runs in the last 7 days
- **Successful Executions**: Number of successful runs in the last 7 days
- **Failed Executions**: Number of failed runs in the last 7 days
- **Health Badge**: 
  - Percentage: successful runs / total runs
  - Color-coded: Green (≥80%), Yellow (50-79%), Red (<50%)
  - "Inactive" label when 0 executions

### Repository Information
- **Organization/Repository**: Clickable link to GitHub repository (opens in new tab)
- **Last Tag**: Most recent repository tag (considers all tags)

### Visual Analytics
- **7-Day Stacked Bar Chart**:
  - One bar per day
  - Green section: successful executions
  - Red section: failed executions
  - Tooltips show exact counts on hover
  - Date range: Last 7 days (from 7 days ago 00:00:00 to now)

### Recent Activity
- **Last 3 Workflow Runs**: Links to GitHub (open in new tab)
- Only shows runs matching selectors

### Repository Insights (Collapsed Accordion)
- **Last 7 Days**:
  - Number of commits
  - Number of contributors
- **All Time**:
  - Total number of commits
  - Total number of contributors
- **Last Commit Details**:
  - Commit message
  - Date and time
  - Contributor name
  - Commit hash (short)
- **Last Successful Workflow**:
  - Duration of execution

### Selector & Metadata (Collapsed Accordion)
- List of all configured selectors
- Selector types and patterns
- Additional metadata

### Actions
- **Manual Refresh Button**: Re-fetch statistics immediately
- **Edit Button**: Update Build configuration
- **Delete Button**: Remove Build with confirmation

### Error Handling
- **Invalid PAT**: Display error banner with "Update Token" CTA
- **API Failures**: Show error message with retry option
- **Expired Cache**: Automatic background refresh

---

## Technical Specifications

### Stack
- **Runtime**: Bun 1.0+
- **Framework**: Next.js 16+ (App Router)
- **Language**: TypeScript 5.0+
- **Styling**: TailwindCSS 3.4+
- **Database**: Drizzle ORM
  - Development: SQLite (bun:sqlite)
  - Production: PostgreSQL (recommended)
- **Authentication**: better-auth
  - Email/password with bcrypt
  - Google OAuth support
  - Session-based authentication
- **Testing**: 
  - Unit: Bun Test (199+ tests)
  - E2E: Playwright (local development only)
- **Icons**: Lucide React
- **Logo**: 🏔️ (mountain emoji)

### Architecture
Clean Architecture under `/src`:
- **`domain/`**: Pure domain logic (no framework dependencies)
  - Models: Build, Selector, Tenant, User, TenantMember, Invitation
  - Validation logic
  - Permission system
- **`use-cases/`**: Application orchestration layer
  - Build management (CRUD operations)
  - Statistics fetching and caching
  - User authentication flows
  - Tenant registration
  - Invitation system
- **`infrastructure/`**: Framework/external dependencies
  - GitHub GraphQL client
  - Database repositories (Drizzle ORM)
  - File system operations
  - Caching layer
  - Authentication (better-auth integration)

### Database Schema

**Tables**:
- `users`: User accounts (id, email, name, password hash via accounts table)
- `sessions`: User sessions (better-auth managed)
- `accounts`: Authentication providers (email/password, OAuth)
- `tenants`: Organization workspaces (id, name, slug)
- `tenant_members`: User-tenant associations (userId, tenantId, role)
- `invitations`: Team invitations (email, token, expiresAt, acceptedAt)
- `builds`: CI build configurations (tenantId, name, org, repo, selectors, PAT, cache)
- `verification_tokens`: Email verification (future feature)

**Relations**:
- Users have many sessions, accounts, tenant memberships, and sent invitations
- Tenants have many members, invitations, and builds
- Builds belong to one tenant
- Invitations belong to one tenant and one inviter

### GitHub API Integration
- **API**: GitHub GraphQL API v4
- **Authentication**: Personal Access Token (PAT) per Build
- **Required Scopes**: `repo`, `workflow`
- **Queries**:
  - Workflow runs with filters (branch, tag, workflow name)
  - Repository tags
  - Commit history (last 7 days and all time)
  - Contributor counts
  - Last commit details
  - Workflow durations
- **Error Handling**: Invalid token detection, rate limiting, network errors

### Caching System
- **Per-Build Cache**: Individual cache expiration (1-1440 minutes)
- **Cache Storage**: In-memory with timestamp tracking
- **Cache Invalidation**: 
  - Automatic on expiration
  - Manual via refresh button
  - Automatic on Build edit
- **Cached Data**:
  - Workflow runs
  - Repository metadata
  - Statistics calculations

### Security
- **Password Hashing**: bcrypt with salt
- **Session Management**: Secure HTTP-only cookies
- **Data Isolation**: Complete tenant separation
- **Role-Based Access**: Permission checks on all operations
- **Token Storage**: GitHub PATs stored in database (plain text - recommend encryption for production)
