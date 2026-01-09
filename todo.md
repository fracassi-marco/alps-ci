# Alps-CI Project Checklist

## 1. Foundation & Project Setup
- [x] Initialize Bun + Next.js (App Router) project with TypeScript and TailwindCSS
- [x] Set up Clean Architecture folder structure under /src (domain, use-cases, infrastructure)
- [x] Add .gitignore (with standard exclusions + .idea)
- [x] Ensure project builds and runs locally
- [x] Add Dockerfile using best practices for Bun + Next.js
- [x] Expose default port in Dockerfile
- [x] Ensure app runs in a container
- [x] Add GitHub Actions workflow for build and test (ci.yml)

## 2. Domain Layer
- [x] Define TypeScript types/interfaces for Build, Selector, BuildStats in /src/domain
- [x] Implement validation logic for cache expiration and selector types
- [x] Write unit tests for domain models and validation logic (cover edge cases)

## 3. Infrastructure Layer
- [x] Implement FileSystemRepository in /src/infrastructure for reading/writing Build objects to data/config.json
- [x] Add logic for timestamped backups before writes
- [x] Write unit tests for FileSystemRepository, including backup logic and error handling

## 4. Use-Cases Layer
- [x] Implement use cases in /src/use-cases for:
  - [x] Listing Builds (listBuilds.ts)
  - [x] Adding a Build (with validation) (addBuild.ts)
  - [x] Editing a Build (editBuild.ts)
  - [x] Deleting a Build (with backup) (deleteBuild.ts)
  - [x] Restoring from backup (manual, not exposed in UI) (restoreFromBackup.ts)
  - [x] Fetching Build Statistics (fetchBuildStats.ts)
- [x] Write unit tests for all Build management use cases (cover edge cases and errors)

## 5. GitHub Integration
- [x] Implement GitHub GraphQL client in /src/infrastructure (authenticate with PAT, fetch workflow runs, tags, metadata)
- [x] Handle errors for invalid tokens (GitHubAuthenticationError)
- [x] Implement caching layer respecting each Build's cache expiration threshold
- [x] Ensure cache is invalidated and refreshed as specified
- [x] Write unit tests for GitHub client and caching logic (token errors, cache expiry)

## 6. UI: Onboarding & Build Management
- [x] Implement welcome screen with onboarding instructions and "Add Build" button (shown when no Builds exist)
- [x] Implement form for adding/editing Builds (all fields, validation, multiple Selectors)
- [x] Display list of Build cards
- [x] Implement deletion with confirmation and config.json backup
- [x] Remove Build card from UI after deletion

## 7. UI: Build Card & Statistics
- [x] Design full-screen Build card with:
  - [x] Number of workflow executions in last 7 days
  - [x] Number of successful workflow executions in last 7 days
  - [x] Number of failed workflow executions in last 7 days
  - [x] Colored health badge (standard thresholds: 90%+ green, 70%+ yellow, <70% red)
  - [x] Last tag (most recent, all tags)
  - [x] Stacked bar chart (last 7 days, showing both successes and failures)
  - [x] Links to last 3 workflow runs (open in new tab)
  - [x] Additional metadata (workflow run durations, created/updated dates, avg duration)
  - [x] Error display if PAT is invalid, with CTA to update
  - [x] Option to delete Build (confirmation, backup)
  - [x] Manual refresh button for statistics
  - [x] Collapsible accordions for Recent Runs and Additional Details

## 8. Integration & Wiring
- [x] Connect UI to use-cases and infrastructure layers
- [x] Ensure all actions (add, edit, delete, refresh) update UI and config.json as expected
- [x] Write end-to-end tests for main user flows:
  - [x] Onboarding (onboarding.spec.ts)
  - [x] Adding/Editing/Deleting Builds
  - [x] Error handling
  - [x] Statistics refresh and display (statistics.spec.ts)

## 9. Finalization
- [x] Polish UI with TailwindCSS (dark mode, responsive design, tooltips, animations)
- [x] Add README documentation (comprehensive with setup, features, architecture)
- [x] Ensure all code follows best practices (Clean Architecture, TypeScript strict mode)
- [x] Commit using gitmoji and keep messages under 128 chars

## 10. Additional Improvements & Fixes
- [x] Move tests from `src/__tests__/` to `__tests__/` in root
- [x] Fix date range calculation for last 7 days (midnight UTC, excludes current time)
- [x] Implement stacked bar chart with success/failure visualization
- [x] Add tooltips on bar chart hover showing counts
- [x] Fix bar chart rendering and sizing issues
- [x] Hide selectors and metadata in collapsible accordions (default closed)
- [x] Hide recent runs in collapsible accordion (default closed)
- [x] Fix selector logic to use AND condition (all selectors must match)
- [x] Optimize icons and labels in statistics display
- [x] Configure E2E tests to not run in CI (disabled in playwright config)
- [x] Fix Docker build issues (Alpine base image configuration)
- [x] Display "Inactive" label instead of health badge when there are 0 executions
- [x] Add component tests for BuildCard using React Testing Library
- [x] Make organization/repository name clickable link to GitHub repository (opens in new tab)
- [x] Add commits in last 7 days statistics
- [x] Add contributors in last 7 days statistics
- [x] Add last commit details (message, date, author, sha with link)
- [x] Fix selector logic from AND to OR (workflow matches ANY selector)
- [x] Add 🏔 logo as favicon in SVG format with PWA manifest
- [x] Add total commits statistics (all time)
- [x] Add total contributors statistics (all time)

## Review & Iteration
- [x] Review each step for completeness and correctness
- [x] Ensure no orphaned code; all modules integrated
- [x] Prioritize early and frequent testing
- [x] Unit tests: 234 passing (including 18 component tests)
- [x] Clean Architecture properly implemented with clear separation of concerns

## 10. Multi-Tenant Architecture (In Progress)

### 10.1. Authentication Infrastructure
- [x] Install better-auth and related packages (@auth/core, arctic, pg)
- [x] Create auth configuration file with email/password and Google OAuth providers
- [x] Set up environment variables for authentication (.env.example)
- [x] Create API route handler for better-auth (/api/auth/[...all])
- [x] Create client-side auth helper (auth-client.ts)
- [x] Create server-side session management utilities (auth-session.ts)
- [x] Add authentication domain types (User, Tenant, TenantMember, Invitation, Role)
- [x] Add authentication validation functions (email, password, tenant name, role)
- [x] Write unit tests for authentication validation (17 tests passing)
- [x] Create AUTH_SETUP.md documentation
- [x] Add script to generate auth secret (bun run auth:generate-secret)
- [x] Update README with authentication setup instructions
- [x] Export authentication utilities from infrastructure index

### 10.2. Database with Tenant Support
- [ ] Set up PostgreSQL/Supabase client configuration
- [ ] Create database migration script for initial schema
- [ ] Define tables: tenants, users, tenant_members, invitations
- [ ] Implement Row Level Security (RLS) policies
- [ ] Add indexes for performance optimization
- [ ] Create seed data for development/testing
- [ ] Write database repository classes for each entity
- [ ] Add unit tests for database operations

### 10.3. Tenant Registration Flow
- [ ] Create registration page UI (sign up form)
- [ ] Implement user registration with better-auth
- [ ] Implement automatic tenant creation on first user sign up
- [ ] Create use-case for tenant creation
- [ ] Associate user as tenant owner in tenant_members
- [ ] Create session with tenant context
- [ ] Redirect to dashboard after successful registration
- [ ] Write unit tests for tenant registration use-case
- [ ] Write E2E tests for registration flow

### 10.4. User Invitation System
- [ ] Create "Invite Member" UI component (button + modal)
- [ ] Implement createInvitation use-case
- [ ] Generate unique invitation tokens with expiration
- [ ] Create invitation acceptance page (public route)
- [ ] Handle invitation token validation
- [ ] Associate invited user with tenant on acceptance
- [ ] Add role selector to invitation UI (owner/admin/member)
- [ ] Create UI to view pending and accepted invitations
- [ ] Add email service integration (or console logging for dev)
- [ ] Write unit tests for invitation use-cases
- [ ] Write E2E tests for invitation flow

### 10.5. Migrate Builds to Multi-Tenant Model
- [ ] Add tenant_id field to Build domain model
- [ ] Create DatabaseBuildRepository using PostgreSQL
- [ ] Create builds database table with RLS policies
- [ ] Implement PAT encryption for database storage
- [ ] Update listBuilds use-case to filter by tenant_id
- [ ] Update addBuild use-case to include tenant_id
- [ ] Update editBuild use-case with tenant context
- [ ] Update deleteBuild use-case with tenant context
- [ ] Create migration script from config.json to database
- [ ] Update API routes to extract tenant_id from session
- [ ] Ensure backward compatibility during migration
- [ ] Update all tests for database-backed repository
- [ ] Write integration tests for multi-tenant build operations

### 10.6. Tenant-Scoped Dashboard UI
- [ ] Create authentication middleware for protected routes
- [ ] Add login page UI
- [ ] Add logout functionality
- [ ] Update dashboard to fetch builds filtered by tenant
- [ ] Add tenant switcher in navigation (if user has multiple tenants)
- [ ] Display tenant name and member count in header
- [ ] Update welcome screen to show tenant name
- [ ] Create "Team Settings" page
- [ ] Show tenant members list in settings
- [ ] Show pending invitations in settings
- [ ] Add session management UI (active sessions, logout all)
- [ ] Write E2E tests for authenticated dashboard access

### 10.7. Role-Based Access Control
- [ ] Define permission utilities in domain layer
- [ ] Create permission checking middleware for API routes
- [ ] Implement UI conditional rendering based on role
- [ ] Add updateMemberRole use-case (owner/admin only)
- [ ] Add removeMember use-case (owner/admin only)
- [ ] Create role management UI in settings page
- [ ] Restrict build deletion to admin/owner roles
- [ ] Restrict build editing to admin/owner roles
- [ ] Allow read-only access for member role
- [ ] Add deleteTenant use-case (owner only)
- [ ] Write unit tests for permission checking
- [ ] Write integration tests for RBAC enforcement
- [ ] Add unauthorized error handling in UI

### 10.8. Multi-Tenant Testing & Documentation
- [ ] Update all E2E tests for multi-tenant scenarios
- [ ] Test tenant isolation (users can't see other tenant's data)
- [ ] Test role permissions at API and UI level
- [ ] Test invitation flow end-to-end
- [ ] Test tenant switching functionality
- [ ] Update README with multi-tenant setup instructions
- [ ] Document database schema in separate doc
- [ ] Add deployment guide for production (with database)
- [ ] Create troubleshooting guide for auth/database issues
- [ ] Update Docker setup to include database connection

