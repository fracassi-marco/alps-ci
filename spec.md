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
- User menu with:
  - Organization link (to team management page)
  - Sign out option
- **View Mode Toggle**: Switch between Grid and List views
  - Toggle button in dashboard header (icon-based: grid icon / list icon)
  - **Grid View** (default): Builds displayed as full-screen cards with all statistics visible
  - **List View**: Builds displayed as compact rows in a table format showing key metrics only
  - User preference saved in browser localStorage
  - View persists across sessions and page reloads

### Organization Management
Accessible via profile menu "Organization" link. Shows:
- **Organization Name**: Display tenant name at the top
- **Members Table**: List of all team members with columns:
  - Name: User's full name
  - Email: User's email address
  - Role: Owner/Admin/Member badge with color coding (clickable dropdown for owners/admins)
  - Joined Date: When they joined the team
  - Actions: Change role dropdown (owner/admin only, cannot change own role or demote last owner)
- **Pending Invitations Table**: List of pending invitations with columns:
  - Email: Invited email address
  - Role: Invited role
  - Invited By: Name of user who sent invitation
  - Expires: Expiration date/time
  - Actions: Revoke button (owner/admin only)
- **Access Control**:
  - All authenticated users can view organization members
  - Only owners/admins can see and revoke pending invitations
  - Only owners/admins can change user roles
  - Revoke action requires confirmation
  - Role change requires confirmation

### Role Management Rules
- **Who can change roles**: Only owners and admins
- **Protection rules**:
  - Cannot change your own role (prevents accidental self-demotion)
  - Cannot demote the last owner (organization must have at least one owner)
  - Cannot promote members to owner if you're only an admin (only owners can create other owners)
- **Confirmation required**: All role changes require confirmation dialog
- **Role change effects**: Take effect immediately after confirmation

### Build Management
When adding a Build, specify:
- **Name**: Descriptive name
- **Organization**: GitHub org name
- **Repository**: Repository name
- **Selectors**: One or more filters (mixed types allowed)
- **Personal Access Token**: GitHub PAT
- **Cache Expiration**: 1-1440 minutes
- **Label** (optional): Label for grouping builds in the UI

Actions:
- **Add**: Create new Build
- **Edit**: Update configuration (triggers immediate refresh)
- **Delete**: Confirmation required, creates backup
- **Refresh**: Manual refresh button for fresh statistics

### Build Grouping
- **Builds are grouped by label** in both Grid and List views
- **Groups are sorted alphabetically** by label name
- **Builds without labels appear last** in a separate "Unlabeled" group
- **Within each group**, builds are sorted by name
- **Group headers** show the label name and count of builds in that group

---

## Build Card UI

### Grid View (Default)
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

### Build Card Enhancements

- **Test Statistics**:
  - Display the number of tests in the last run and the number of failed tests for each build.
  - Check if the uploaded artifacts contain files matching the `*test*.xml` pattern.
  - Extract test data using the JUnit format.
  - If no data is found, hide the test section in the build card.

---

## List View UI

When List View is selected, Builds are displayed in a table format with expandable rows:

### Table Columns (Collapsed State)
- **Name**: Build name with org/repo link underneath
- **Health**: Health badge or "Inactive" label
- **7-Day Stats**: Total / Success / Failed counts (compact format: "15 / 14 / 1")
- **Last Tag**: Most recent repository tag
- **Last Run**: Date/time of most recent workflow run
- **Actions**: 
  - Expand/Collapse button (chevron icon)
  - Refresh button (icon only)
  - Edit button (icon only)
  - Delete button (icon only)

### Expanded Row Details
When a row is expanded, it shows all the same information as Grid View:
- **7-Day Stacked Bar Chart**: Visual chart showing successful and failed executions
- **Recent Workflow Runs**: Last 3 runs with links (open in new tab)
- **Repository Insights** (Collapsible accordion):
  - Commits in last 7 days
  - Contributors in last 7 days
  - Total commits
  - Total contributors
- **Last Commit Details** (Collapsible accordion):
  - Commit message
  - Date and time
  - Author name
  - Commit hash (clickable link)
- **Last Successful Workflow Duration**
- **Selectors & Metadata** (Collapsible accordion):
  - List of all configured selectors
  - Cache expiration settings

### Behavior
- **Row Click**: Toggle expand/collapse to show/hide full details
- **Expand Button**: Explicit button to toggle expansion
- **Hover State**: Subtle background highlight
- **Responsive**: Table scrolls horizontally on narrow screens, expanded content flows naturally
- **Actions**: Same delete confirmation and refresh logic as grid view
- **Persistence**: Expanded state is not persisted (all rows collapsed on page load)

### Persistence
- View mode (grid/list) saved in browser localStorage
- Key: `alps-ci-view-mode`
- Values: `"grid"` or `"list"`
- Default: `"grid"` if not set
- Persists across browser sessions

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
- **Token Storage**: GitHub PATs encrypted in database (AES-256-GCM)

### PAT (Personal Access Token) Management

#### Overview
Owners and admins can save GitHub PATs centrally for their organization. PATs are encrypted in database and reusable across builds.

#### Database Schema
- **Table**: `personal_access_tokens`
  - `id`, `tenantId`, `name`, `encryptedToken`, `createdBy`, `lastUsed`, `createdAt`, `updatedAt`
  - Encrypted with AES-256-GCM, key in `ENCRYPTION_KEY` env var
- **Builds table**: Add `patId` (FK to PATs, nullable), keep existing `personalAccessToken` for backward compatibility

#### UI - PAT Management Page
- **Location**: Organization page, "GitHub Tokens" section (owners/admins only)
- **List**: Table with Name, Last Used, Created By, Actions (Edit/Delete)
- **Add**: Modal with Name (required), Token (password field)
- **Edit**: Update name, optionally replace token
- **Delete**: Confirm with warning if builds use it

#### UI - Build Form
- **Dropdown**: Select saved organization PAT
- **Inline option**: Enter new token directly (existing behavior)
- When build fetches stats: resolve token (saved PAT or inline), decrypt, use

#### Security
- Tokens encrypted (AES-256-GCM), never exposed in API
- Only owners/admins can manage PATs
- Members can use saved PATs but not manage them

### Build Storage & Access Control
- **Persistence**: Builds are stored in the application database (not JSON files). Each create/edit/delete operation must go through the database layer.
- **Tenant Association**: Every Build row references its owning tenant/organization (foreign key).
- **Visibility**: Only members of a tenant can view, edit, delete, or fetch statistics for that tenant's builds.
- **Queries**: All build list/detail/statistics queries must filter by the current user's tenant ID.
- **Migrations**: Provide schema migrations for the builds table (with tenant_id FK) and any related indexes.
- **Legacy JSON**: JSON config persistence is deprecated; repository implementations should read/write from the database only.

### Test Results Detail Page

#### Overview
When users click on test statistics in a Build card (e.g., "25 / 23 / 2" showing total/passed/failed tests), they are navigated to a dedicated page that displays detailed test results from the JUnit XML artifacts.

#### Navigation
- **Trigger**: Click on test stats section in Build card
- **URL**: `/builds/[buildId]/tests/[runId]`
- **Target**: Opens in current window (not new tab)
- **Breadcrumb**: Show navigation back to dashboard

#### Page Layout
**Header**:
- Build name
- Workflow run name
- Run date and time
- Duration
- Link back to dashboard

**Summary Section**:
- Total tests
- Passed tests (green)
- Failed tests (red)
- Skipped tests (yellow)
- Success rate percentage with visual indicator

**Test Results Table**:
- Columns: Status (icon), Test Name, Test Suite, Duration, Error Message (if failed)
- Sortable by: Status, Name, Duration
- Filterable by: All / Passed / Failed / Skipped
- Color-coded status indicators
- **Accordion for Test Suites**: Each test suite file (e.g., `__tests__/components/BuildCard.test.tsx`) is displayed as a collapsible accordion row
  - **Collapsed state**: Shows suite name, overall status, total test count, and aggregate duration
  - **Expanded state**: Shows all individual tests within that suite with full details
  - Click to toggle between collapsed/expanded
  - Expand icon changes (ChevronDown/ChevronUp) based on state
- **Individual Test Details** (within expanded accordion):
  - Test name
  - Status icon (CheckCircle/XCircle/MinusCircle)
  - Duration
  - Error message and stack trace for failed tests
  - Formatted and syntax-highlighted stack traces

**Bun JUnit XML Compatibility**:
- Handles Bun's JUnit XML format which only provides suite-level statistics
- When individual test cases are not available in XML, displays suite-level summary
- When test runner provides individual test case details, shows full granular data

**Failure Details** (for failed tests):
- Full error message
- Stack trace (formatted and syntax-highlighted if possible)
- File and line number (if available in XML)

#### Data Source
- Fetch workflow run artifacts from GitHub API
- Download and unzip artifacts containing `*test*.xml` files
- Parse JUnit XML using existing `parseJUnitXML` utility
- Display parsed test case details

#### Error Handling
- If no test artifacts found: Show message "No test results available for this run"
- If artifact download fails: Show error with retry button
- If XML parsing fails: Show raw error and allow download of XML file

#### Permissions
- Only authenticated users
- Only members of the build's tenant can access
- Return 403 if user doesn't belong to the build's tenant

#### API Endpoints
- `GET /api/builds/[buildId]/tests/[runId]`: Fetch and parse test results
  - Downloads artifacts from GitHub
  - Extracts and parses XML files
  - Returns structured test case data
  - Caches results for 1 hour

#### Performance
- Cache parsed test results to avoid repeated GitHub API calls
- Show loading state while fetching/parsing
- Lazy load full stack traces for failed tests

