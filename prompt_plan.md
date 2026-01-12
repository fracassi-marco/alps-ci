# Blueprint and Prompt Plan for Alps-CI

## 1. Foundation & Project Setup

### 1.1. Initialize Project
```
Prompt: Initialize a new Bun + Next.js (App Router) project with TypeScript and TailwindCSS. Set up the recommended folder structure for Clean Architecture under /src: domain, use-cases, infrastructure. Add a .gitignore and ensure the project builds and runs locally.
```

### 1.2. Docker & Basic CI
```
Prompt: Add a Dockerfile using best practices for Bun + Next.js. Expose the default port and ensure the app runs in a container. Add a simple GitHub Actions workflow to build and test the app in CI.
```

---

## 2. Domain Layer

### 2.1. Define Core Domain Models
```
Prompt: In /src/domain, define TypeScript types/interfaces for Build, Selector, and BuildStats. Include validation logic for cache expiration and selector types.
```

### 2.2. Unit Tests for Domain Models
```
Prompt: Write unit tests for the domain models and validation logic using your preferred test runner. Ensure all edge cases are covered.
```

---

## 3. Infrastructure Layer

### 3.1. File System Repository
```
Prompt: In /src/infrastructure, implement a FileSystemRepository for reading/writing the array of Build objects to data/config.json. Add logic for timestamped backups before writes.
```

### 3.2. Unit Tests for File System Repository
```
Prompt: Write unit tests for the FileSystemRepository, including backup logic and error handling.
```

---

## 4. Use-Cases Layer

### 4.1. Build Management Use Cases
```
Prompt: In /src/use-cases, implement use cases for: listing Builds, adding a Build (with validation), editing a Build, deleting a Build (with backup), and restoring from backup (manual, not exposed in UI).
```

### 4.2. Unit Tests for Use Cases
```
Prompt: Write unit tests for all Build management use cases, including edge cases and error scenarios.
```

---

## 5. GitHub Integration

### 5.1. GitHub GraphQL Client
```
Prompt: In /src/infrastructure, implement a GitHub GraphQL client that authenticates with a PAT and fetches workflow runs, tags, and workflow metadata. Handle errors for invalid tokens.
```

### 5.2. Caching Layer
```
Prompt: Implement a caching layer that respects each Build's cache expiration threshold. Ensure cache is invalidated and refreshed as specified.
```

### 5.3. Unit Tests for GitHub Client & Caching
```
Prompt: Write unit tests for the GitHub client and caching logic, including token errors and cache expiry.
```

---

## 6. UI: Onboarding & Build Management

### 6.1. Welcome & Onboarding
```
Prompt: Implement a welcome screen with onboarding instructions and an "Add Build" button, shown when no Builds exist.
```

### 6.2. Add/Edit Build Form
```
Prompt: Implement a form for adding and editing Builds, supporting all required fields and validation. Allow multiple Selectors (custom/free text, mixed types).
```

### 6.3. Build List & Deletion
```
Prompt: Display a list of Build cards. Implement deletion with confirmation and trigger config.json backup. Remove the card from the UI after deletion.
```

---

## 7. UI: Build Card & Statistics

### 7.1. Build Card Layout
```
Prompt: Design a full-screen Build card showing all required statistics, health badge, last tag, bar chart (successes only), and links to last 3 runs (open in new tab). Add a manual refresh button.
```

### 7.2. Error Handling in UI
```
Prompt: Display errors on the Build card if the PAT is invalid, with a CTA to update the PAT.
```

### 7.3. Additional Metadata
```
Prompt: Add workflow run durations and any other useful metadata to the Build card.
```

### 7.4.1. Inactive Health Label
```
Prompt: When there are 0 executions for a Build, display an "Inactive" label instead of a health badge on the Build card. Ensure this is reflected in both the UI and any related logic.
```

### 7.4.2. Clickable Repository Link
```
Prompt: Under the Build name, display the organization/repository name as a clickable link to the GitHub repository (open in a new tab).
```

### 7.4.3. Additional Build Statistics
```
Prompt: Add the following statistics to the Build card:
- Number of commits in the last 7 days
- Number of contributors in the last 7 days
- Last commit details: message, date, contributor, and commit hash
- Total number of commits
- Total number of contributors

Update the UI, domain models, use-cases, and infrastructure as needed to support these features. Ensure all new data is fetched from the GitHub API and displayed in a harmonized, user-friendly way. Add or update tests to cover these enhancements.
```

---

## 8. Integration & Wiring

### 8.1. Wire Use Cases to UI
```
Prompt: Connect the UI to the use-cases and infrastructure layers. Ensure all actions (add, edit, delete, refresh) update the UI and config.json as expected.
```

### 8.2. End-to-End Testing
```
Prompt: Write end-to-end tests for the main user flows: onboarding, adding/editing/deleting Builds, error handling, and statistics refresh.

Note: E2E tests are for local development only and are NOT run in CI/CD pipelines.
```

---

## 9. Finalization

### 9.1. Polish & Documentation
```
Prompt: Polish the UI with TailwindCSS, add README documentation, and ensure all code follows best practices. Commit using gitmoji and keep messages under 128 chars.
```

---

## 10. Multi-Tenant Architecture

### 10.1. Setup Authentication Infrastructure ✅ COMPLETED
```
Prompt: Set up better-auth with email/password and Google OAuth providers. Configure the authentication system to support multi-tenant architecture with user sessions and token management. Install necessary dependencies (better-auth, related OAuth packages). Create the auth configuration file with providers, session settings, and callbacks. Set up environment variables for OAuth credentials (Google Client ID/Secret) and auth secret keys.

Status: ✅ Completed
- Installed better-auth, @auth/core, arctic, pg packages
- Created auth.ts configuration with PostgreSQL and OAuth providers
- Set up auth-client.ts for client-side authentication
- Created auth-session.ts for server-side session management
- Added authentication domain types (User, Tenant, TenantMember, Invitation, Role)
- Implemented validation functions for email, password, tenant name, role, and slug generation
- Created 17 passing unit tests for authentication validation
- Added AUTH_SETUP.md comprehensive documentation
- Created script to generate auth secrets (bun run auth:generate-secret)
- Updated .env.example with all required environment variables
- All tests passing (234 unit tests)
```

### 10.2. Setup Database with Tenant Support
```
Prompt: Set up Supabase client (or PostgreSQL connection) and create the core database schema for multi-tenant architecture. Define and create the following tables:
- tenants: id (uuid), name (string), slug (string, unique), created_at, updated_at
- users: id (uuid), email (string, unique), name (string), avatar_url (string), created_at, updated_at
- tenant_members: id (uuid), tenant_id (fk), user_id (fk), role (enum: owner, admin, member), invited_by (fk to users), joined_at, created_at
- invitations: id (uuid), tenant_id (fk), email (string), role (enum), token (string, unique), invited_by (fk to users), expires_at, accepted_at, created_at

Implement Row Level Security (RLS) policies to ensure users can only access data from tenants they belong to. Create indexes for performance. Add migration scripts and seed data for development.
```

### 10.3. Implement Tenant Registration Flow ✅ COMPLETED
```
Prompt: Create the tenant registration flow where the first user creates a new tenant (company) during signup. Build the following:
- Registration page with fields: user name, email, password, company name
- Use better-auth for user creation
- After user creation, automatically create a new tenant with a generated slug
- Associate the user as the tenant owner in tenant_members table
- Create a session with tenant context
- Redirect to the empty dashboard with onboarding

Update domain models to include Tenant and TenantMember types. Create use-cases for tenant creation and user-tenant association. Add repository methods for tenant operations. Write unit tests for tenant creation logic.

Status: ✅ Completed
- Created RegisterTenantUseCase with automatic slug generation
- Implemented slug collision handling (appends -1, -2, etc.)
- Created DatabaseTenantRepository with create, findBySlug, findById methods
- Created DatabaseTenantMemberRepository with create, findByUserIdAndTenantId, findByUserId, findByTenantId methods
- Built registration page at /auth/register with all required fields
- Built sign-in page at /auth/signin
- Created /api/auth/register endpoint for complete user and tenant creation
- Integrated bcryptjs for secure password hashing
- User automatically associated as 'owner' role upon tenant creation
- Wrote 12 comprehensive unit tests covering:
  - Successful tenant creation
  - Slug generation with special characters
  - Slug collision handling (single and multiple)
  - Validation errors (empty name, whitespace, max length)
  - Edge cases (emojis, numbers, timestamps)
- Fixed database client to use dynamic imports for bun:sqlite (avoids build errors)
- All 246 tests passing (12 new + 234 existing)
```

### 10.4. Implement User Invitation System ✅ COMPLETED
```
Prompt: Build the invitation system allowing tenant owners/admins to invite colleagues via email. Implement:
- UI component: "Invite Member" button and modal with email input and role selector
- Use-case: createInvitation (validates email, generates unique token, sets expiration)
- Send invitation email with acceptance link (can use a simple email service or log to console for dev)
- Public invitation acceptance page: accepts token, validates expiration, allows user to sign up or sign in
- After acceptance, associate user with tenant and mark invitation as accepted
- UI to view pending and accepted invitations (tenant admins only)

Add role-based permission checks. Update tests to cover invitation creation, expiration, and acceptance flows.

Status: ✅ Completed
- Created CreateInvitationUseCase with secure token generation (32 bytes)
- Created AcceptInvitationUseCase with expiration and validation checks
- Implemented DatabaseInvitationRepository with create, findByToken, findByEmail, findPendingByTenantId, markAsAccepted
- Created permissions module with canInviteMembers, canManageBuilds, canRemoveMembers, etc.
- Built /api/invitations endpoint (POST to create, GET to list pending)
- Built /api/invitations/[token] endpoint (GET details, POST to accept)
- Created /invite/[token] page for accepting invitations
- Invitation features:
  - 7-day expiration by default
  - Secure random token generation
  - Email validation
  - Role validation (owner/admin/member)
  - Permission checks (only owners/admins can invite)
  - Duplicate membership prevention
  - Expiration validation
  - Already accepted validation
- Wrote 19 comprehensive unit tests covering:
  - Successful invitation creation (5 tests)
  - Validation errors (3 tests)
  - Edge cases (2 tests)
  - Successful acceptance (3 tests)
  - Acceptance validation errors (4 tests)
  - Acceptance edge cases (2 tests)
- All 265 tests passing (19 new + 246 existing)
- Email sending: Log to console (TODO: integrate email service)
```

### 10.5. Migrate Builds to Multi-Tenant Model
```
Prompt: Update the existing Builds data model to support multi-tenancy. Make the following changes:
- Add tenant_id field to Build model
- Migrate FileSystemBuildRepository to DatabaseBuildRepository using Supabase/PostgreSQL
- Create builds table: id (uuid), tenant_id (fk), name, organization, repository, selectors (jsonb), pat (encrypted), cache_expiration, created_at, updated_at
- Add RLS policies to builds table (users can only see builds from their tenants)
- Update all use-cases (listBuilds, addBuild, editBuild, deleteBuild) to include tenant_id context
- Update API routes to extract tenant_id from authenticated user session
- Migrate existing data from config.json to database (create a migration script)

Ensure backward compatibility during migration. Update all tests to work with the new database-backed repository.
```

### 10.6. Implement Tenant-Scoped Dashboard UI
```
Prompt: Update the dashboard UI to display only data belonging to the current user's tenant. Implement:
- Protected routes that require authentication
- Middleware to verify user session and load tenant context
- Update dashboard to fetch and display only builds for current tenant
- Add tenant switcher in navigation if user belongs to multiple tenants (show tenant name, allow switching)
- Display tenant name and member count in header/navigation
- Update welcome screen to show tenant name
- Add "Team Settings" page showing tenant members and pending invitations

Ensure all API calls include tenant context. Update tests for authenticated routes.
```

### 10.7. Add Role-Based Access Control
```
Prompt: Implement role-based access control (RBAC) within tenants. Define the following roles and permissions:
- Owner: Full access (manage builds, invite/remove members, delete tenant)
- Admin: Manage builds, invite members (cannot remove owner or delete tenant)
- Member: View builds only (read-only access)

Implement:
- Permission checking utilities in domain layer
- Middleware to enforce permissions on API routes
- UI components that conditionally render based on user role (hide delete buttons for members, etc.)
- Use-cases for role management (updateMemberRole, removeMember - owner/admin only)
- Settings page for role management

Add comprehensive tests for permission checks and role-based operations. Ensure proper error messages when unauthorized actions are attempted.
```

### 10.8. Implement Organization Management Page
```
Prompt: Create an Organization management page accessible from the user profile menu. Implement the following:

**Navigation**:
- Add "Organization" link in user profile menu (above "Sign out")
- Create route `/organization` protected by authentication middleware

**Organization Page UI** (`/app/organization/page.tsx`):
- Display tenant/organization name as page title
- Show two main sections:

**1. Members Table**:
- Display all team members in a responsive table with columns:
  - Name: User's full name
  - Email: User's email address  
  - Role: Badge component with color coding (Owner=purple, Admin=blue, Member=gray)
  - Joined Date: Formatted date (e.g., "Jan 12, 2026")
- All authenticated users can view this table
- Sort by joined date (newest first)

**2. Pending Invitations Table** (visible to owners/admins only):
- Display pending (not yet accepted) invitations with columns:
  - Email: Invited email address
  - Role: Badge showing invited role
  - Invited By: Name of user who sent the invitation
  - Expires: Formatted expiration date/time with warning if expiring soon (<24h)
  - Actions: "Revoke" button (confirmation dialog required)
- Filter invitations where acceptedAt is null and expiresAt > now
- Show empty state message if no pending invitations

**Backend**:
- Create `/api/organization/members` GET endpoint:
  - Returns list of tenant members with user details
  - Requires authentication
  - Filters by current user's tenant
- Create `/api/organization/invitations` GET endpoint:
  - Returns pending invitations for tenant
  - Requires authentication + owner/admin role
  - Includes inviter name via join
- Create `/api/organization/invitations/[id]` DELETE endpoint:
  - Revokes/deletes invitation
  - Requires authentication + owner/admin role
  - Returns 403 if user lacks permission

**Tests**:
- Unit tests for organization data fetching use-cases
- API route tests for permissions and data filtering
- Component tests for Members and Invitations tables
- E2E test for viewing organization page

**UI/UX**:
- Use Lucide icons (Users, Mail, UserCheck, X)
- Responsive table design (stack on mobile)
- Loading states while fetching data
- Error boundaries for API failures
- Confirmation dialog for revoke action ("Are you sure you want to revoke this invitation?")
- Success toast after revoking invitation
- Role badges with consistent color scheme
```

### 10.9. Implement Role Management for Team Members
```
Prompt: Add the ability for owners and admins to change the roles of team members. Implement the following:

**Use-Case Layer** (`src/use-cases/changeMemberRole.ts`):
- Create `ChangeMemberRoleUseCase` with the following validations:
  - User must be owner or admin to change roles
  - Cannot change your own role (prevent self-demotion)
  - Cannot demote the last owner (must maintain at least one owner)
  - Only owners can promote members to owner role (admins cannot create other owners)
  - Validate new role is one of: 'owner', 'admin', 'member'
- Accept parameters: `{ userId: string, targetMemberId: string, newRole: string, tenantId: string }`
- Return success/error with descriptive messages

**Repository Method**:
- Add `updateMemberRole(memberId: string, newRole: string): Promise<void>` to `TenantMemberRepository` interface
- Implement in `DatabaseTenantMemberRepository` using Drizzle ORM

**API Endpoint** (`/api/organization/members/[id]/role`):
- Create PATCH endpoint to update member role
- Extract current user from session
- Fetch current user's tenant membership and role
- Validate user has permission (owner or admin)
- Call `ChangeMemberRoleUseCase` with parameters
- Return 200 on success with updated member data
- Return appropriate error codes:
  - 401: Not authenticated
  - 403: Insufficient permissions
  - 400: Invalid role or business rule violation (e.g., last owner, self-change)
  - 404: Member not found

**UI Component** (`/app/organization/page.tsx`):
- Add role dropdown in Actions column of Members table
- Show dropdown only for owners/admins
- Disable dropdown for:
  - Current user's own row (cannot change own role)
  - Last owner (if current member is owner)
- On role selection:
  - Show confirmation dialog: "Change {name}'s role from {oldRole} to {newRole}?"
  - On confirm, call API endpoint
  - Show loading state during API call
  - On success: Update table, show success toast, refresh data
  - On error: Show error message with reason
- Role dropdown options:
  - Owner (only for current owners)
  - Admin
  - Member

**Confirmation Dialog**:
- Title: "Change Member Role?"
- Message: "Are you sure you want to change {userName}'s role from {currentRole} to {newRole}? This will take effect immediately."
- Warning for demoting owner: "This user will lose owner privileges including the ability to delete the organization."
- Buttons: Cancel, Confirm

**Tests**:
- Unit tests for `ChangeMemberRoleUseCase`:
  - Successful role change (owner/admin changing member)
  - Owner promoting member to admin
  - Owner promoting member to owner
  - Admin promoting member to admin
  - Admin cannot promote to owner (error)
  - Cannot change own role (error)
  - Cannot demote last owner (error)
  - Invalid role (error)
  - Member cannot change roles (error)
- API route tests for permissions and validations
- E2E test for changing member role

**Business Rules Summary**:
1. Only owners and admins can change roles ✅
2. Cannot change your own role ✅
3. Cannot demote the last owner ✅
4. Only owners can create other owners ✅
5. All role changes require confirmation ✅
6. Changes take effect immediately ✅

**UI/UX**:
- Use dropdown menu (ChevronDown icon) in Actions column
- Color-coded role badges match existing design
- Loading spinner during role change
- Success toast: "✅ {name}'s role changed to {newRole}"
- Error toast: "❌ {errorMessage}"
- Disabled state styling for non-editable roles
- Confirmation dialog with role-specific warnings
```

---

# Review & Iteration

- Each step is small, testable, and builds on the previous.
- No orphaned code: every module is integrated before moving on.
- Early and frequent testing is prioritized.
- Prompts are ready for a code-generation LLM to implement in a test-driven, incremental manner.
