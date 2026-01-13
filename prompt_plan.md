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

### 10.10. Persist Builds in Database with Tenant Scope
```
Prompt: Replace JSON-based build storage with database-backed persistence scoped by tenant membership.

**Backend / Database**:
- Add `builds` table migrations with columns: `id`, `tenant_id` (FK), `name`, `organization`, `repository`, `selectors` (JSON), `pat`, `cacheExpirationMinutes`, timestamps.
- Update Drizzle schema and repository implementations to target the DB table.
- Remove FileSystemBuildRepository usage from production paths (keep only if needed for legacy import CLI).
- Ensure all CRUD operations filter by `tenant_id` from the current user’s membership.

**Use-Cases & Infrastructure**:
- Update Build-related use cases (list/add/edit/delete/fetch stats) to depend on a database repository that enforces tenant scoping.
- Inject current tenant ID into use cases via controllers/API routes.
- Ensure selectors, PAT, cache metadata are serialized/deserialized safely.

**API Routes**:
- `/api/builds` (GET/POST), `/api/builds/[id]` (PATCH/DELETE), `/api/builds/[id]/stats` must include tenant filters.
- Reject access if the authenticated user is not a member of the tenant owning the build.

**UI**:
- Ensure dashboard fetches builds only for the user’s tenant (no cross-tenant leakage).
- Handle errors when user lacks access to a build.

**Tests**:
- Update unit tests and integration tests to mock database repository.
- Add tests covering tenant isolation (user cannot access other tenant’s builds).
```

---

### 10.11. Add Grid/List View Toggle for Builds (Part 1: List View Component)
```
Prompt: Implement a compact List View component for displaying builds in a table format alongside the existing Grid View.

**UI Component** (`/app/components/BuildListView.tsx`):
- Create a new component that displays builds in a table with columns:
  - **Name**: Build name (bold) with org/repo as clickable link below (text-sm, muted)
  - **Health**: Badge showing percentage (color-coded: green ≥80%, yellow 50-79%, red <50%) or "Inactive" label
  - **7-Day Stats**: Compact format showing "Total / Success / Failed" (e.g., "15 / 14 / 1")
  - **Last Tag**: Repository tag or "—" if none
  - **Last Run**: Relative time (e.g., "2 hours ago") or "—" if none
  - **Actions**: Icon-only buttons (Refresh, Edit, Delete) with tooltips
- Use Lucide icons: LayoutGrid (grid), LayoutList (list), RefreshCw (refresh), Edit (edit), Trash2 (delete)
- Apply TailwindCSS styling:
  - Table: `border`, `rounded`, responsive with `overflow-x-auto`
  - Rows: Hover state with subtle background
  - Headers: Bold, slightly larger text
  - Actions: Icon buttons with hover effects
- Include same confirmation dialog for delete as grid view
- Include same refresh logic (loading state, error handling)
- Props: `builds`, `onRefresh`, `onEdit`, `onDelete`

**Responsive Design**:
- Horizontal scroll on narrow screens
- Stack action buttons vertically on mobile if needed
- Preserve all functionality on mobile

**Tests**:
- Unit test: Render builds in table format
- Unit test: Handle empty builds array
- Unit test: Delete confirmation flow
- Unit test: Action callbacks are invoked correctly
```

### 10.12. Add Grid/List View Toggle for Builds (Part 2: View Toggle & localStorage)
```
Prompt: Add a view mode toggle button to the dashboard and implement browser localStorage persistence for user preference.

**UI Updates** (`/app/page.tsx`):
- Add view mode toggle button to dashboard header (next to "Add Build" and "Invite" buttons)
- Use Lucide icons: `LayoutGrid` for grid view, `LayoutList` for list view
- Button shows current view mode (e.g., if grid is active, show list icon to switch to list)
- Toggle button styling:
  - Icon button with border
  - Tooltip: "Switch to List View" / "Switch to Grid View"
  - Active state visual indicator (subtle background color)
  - Smooth transition on toggle

**State Management**:
- Create custom hook `useViewMode` in `/app/hooks/useViewMode.ts`:
  - Returns current view mode (`"grid"` | `"list"`)
  - Returns toggle function
  - Manages localStorage persistence
  - Key: `alps-ci-view-mode`
  - Default: `"grid"`
  - Syncs state on mount from localStorage
  - Updates localStorage on toggle

**localStorage Logic**:
- Read on component mount (client-side only, check `typeof window !== 'undefined'`)
- Write immediately on toggle
- Handle localStorage not available (fallback to memory-only state)
- No server-side issues (use `useEffect` for initial read)

**Conditional Rendering** (`/app/page.tsx`):
- If `viewMode === "grid"`: Render existing `BuildCard` components in grid layout
- If `viewMode === "list"`: Render new `BuildListView` component
- Pass same props (`builds`, `onRefresh`, `onEdit`, `onDelete`) to both views
- Both views use same data fetching and state management

**Implementation Details**:
```typescript
// Example hook structure
export function useViewMode() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  useEffect(() => {
    // Read from localStorage on mount
    const saved = localStorage.getItem("alps-ci-view-mode");
    if (saved === "list" || saved === "grid") {
      setViewMode(saved);
    }
  }, []);
  
  const toggleViewMode = () => {
    setViewMode((prev) => {
      const next = prev === "grid" ? "list" : "grid";
      localStorage.setItem("alps-ci-view-mode", next);
      return next;
    });
  };
  
  return { viewMode, toggleViewMode };
}
```

**Tests**:
- Unit test: `useViewMode` hook reads from localStorage
- Unit test: `useViewMode` hook writes to localStorage on toggle
- Unit test: `useViewMode` defaults to "grid" when localStorage is empty
- Unit test: Dashboard renders grid view by default
- Unit test: Dashboard switches to list view when toggled
- E2E test: Toggle persists across page reload
```

### 10.13. Add Grid/List View Toggle for Builds (Part 3: Integration & Polish)
```
Prompt: Polish the grid/list view toggle UI, ensure consistent behavior, and add comprehensive tests.

**UI Polish**:
- Ensure consistent spacing and alignment of toggle button with other dashboard header elements
- Add smooth fade transition when switching between grid and list views (CSS transition)
- Ensure both views handle loading states identically:
  - Show skeleton loaders while fetching builds
  - Show same error messages for failed fetches
  - Display welcome screen when no builds exist (regardless of view mode)
- Verify all icons are properly sized and aligned
- Test responsive behavior on mobile, tablet, desktop
- Ensure keyboard navigation works (toggle button should be focusable and activatable with Enter/Space)

**Accessibility**:
- Add ARIA labels to toggle button: `aria-label="Switch to List View"`
- Add ARIA live region for view mode changes: "View mode changed to list view"
- Ensure table in list view has proper ARIA roles
- Test with keyboard navigation
- Test with screen reader

**Edge Cases**:
- Handle localStorage quota exceeded (rare, but possible)
- Handle corrupted localStorage value (validate before using)
- Ensure SSR doesn't cause hydration mismatch (view mode determined client-side only)
- Test with localStorage disabled (private browsing mode)

**Performance**:
- Memoize build list rendering if needed
- Ensure switching views doesn't cause unnecessary re-fetches
- Lazy load heavy components if applicable

**Documentation**:
- Update README with view mode feature description
- Add comments in code explaining localStorage usage
- Document the `useViewMode` hook API

**Tests**:
- E2E test: Complete flow - toggle view, reload page, verify persistence
- E2E test: Switch between views multiple times
- E2E test: Perform actions (refresh, edit, delete) in both views
- Unit test: Error handling in list view matches grid view
- Unit test: Welcome screen shows regardless of view mode preference
- Visual regression test: Compare screenshots of both views

**Integration Checklist**:
- ✅ Grid view (existing) works without regressions
- ✅ List view displays all key metrics
- ✅ Toggle button switches views instantly
- ✅ Preference persists in localStorage
- ✅ Both views use same data and actions
- ✅ Responsive on all screen sizes
- ✅ Accessible via keyboard and screen reader
- ✅ No SSR/hydration issues
- ✅ Error handling consistent across views
- ✅ Tests cover all user flows
```

---

## 15. PAT (Personal Access Token) Management - Feature-Based Slices

### Feature 15.1: View Saved PATs (Read-Only List)

```
Implement complete vertical slice to VIEW saved organization PATs. Owners/admins can see a list of PATs on the Organization page.

**What Users Can Do**: Navigate to Organization page → See "GitHub Tokens" section → View table with saved PATs

**Implementation (Full Stack)**:
- **Encryption Service** (`src/infrastructure/encryption.ts`): Basic encrypt/decrypt with AES-256-GCM, read `ENCRYPTION_KEY` from env
- **Database**: Create `personalAccessTokens` table (id, tenantId, name, encryptedToken, createdBy, lastUsed, createdAt, updatedAt), add indexes, run migration
- **Domain**: Add `PersonalAccessToken` and `PersonalAccessTokenResponse` interfaces
- **Repository**: Implement `findByTenantId()` method (joins with users for creator names)
- **Use Case**: `listPersonalAccessTokens.ts` - verify owner/admin, fetch and return PATs
- **API**: GET `/api/pats` - returns list (without encrypted tokens)
- **UI Component**: `PATList.tsx` - table showing Name, Last Used, Created By, Created (read-only, no actions yet)
- **Organization Page**: Add "GitHub Tokens" section (owners/admins only), render PATList

**Testing**: E2E test - owner logs in, navigates to Organization, sees PAT list (empty state and with data)

**Commit**: ✨ Add view saved PATs feature
```

### Feature 15.2: Add New PAT

```
Implement complete vertical slice to ADD a new PAT. Owners/admins can save a GitHub token.

**What Users Can Do**: Click "Add GitHub Token" → Enter name and token → Save → See it in list

**Implementation (Full Stack)**:
- **Repository**: Add `create()` method to PersonalAccessTokenRepository
- **Use Case**: `createPersonalAccessToken.ts` - verify owner/admin, validate name uniqueness, encrypt token, save
- **API**: POST `/api/pats` - accepts {name, token}, creates encrypted PAT
- **UI Component**: `AddPATModal.tsx` - form with name (text), token (password field with show/hide), save/cancel buttons
- **Organization Page**: Add "Add GitHub Token" button, opens modal, handles save, refreshes list

**Testing**: E2E test - owner clicks add button, enters name + token, saves, sees new PAT in list

**Commit**: ✨ Add create new PAT feature
```

### Feature 15.3: Edit Existing PAT

```
Implement complete vertical slice to EDIT a PAT. Owners/admins can update the name or replace the token.

**What Users Can Do**: Click edit icon on PAT row → Change name and/or token → Save → See updated info

**Implementation (Full Stack)**:
- **Repository**: Add `update()` method to PersonalAccessTokenRepository
- **Use Case**: `updatePersonalAccessToken.ts` - verify owner/admin, update name/token, re-encrypt if token changed
- **API**: PATCH `/api/pats/[id]` - accepts {name?, token?}, updates PAT
- **UI Component**: Extend `AddPATModal` to support edit mode (pre-fill name, optional token replacement)
- **PATList**: Add edit icon button in Actions column, opens modal in edit mode

**Testing**: E2E test - owner clicks edit, changes name, saves, sees updated name; owner replaces token, saves successfully

**Commit**: ✨ Add edit PAT feature
```

### Feature 15.4: Delete PAT

```
Implement complete vertical slice to DELETE a PAT. Owners/admins can remove unused PATs.

**What Users Can Do**: Click delete icon → See warning if builds use it → Confirm → PAT removed from list

**Implementation (Full Stack)**:
- **Repository**: Add `delete()` method and `countBuildsUsingPAT()` method
- **Use Case**: `deletePersonalAccessToken.ts` - verify owner/admin, check builds, delete if unused
- **API**: DELETE `/api/pats/[id]` - returns 409 if builds use it, otherwise deletes
- **UI Component**: `DeletePATDialog.tsx` - confirmation dialog, shows warning with build list if in use
- **PATList**: Add delete icon button in Actions column, opens dialog

**Testing**: E2E test - owner deletes unused PAT successfully; owner tries to delete PAT in use, sees error

**Commit**: ✨ Add delete PAT feature
```

### Feature 15.5: Use Saved PAT in Build

```
Implement complete vertical slice to USE a saved PAT when creating a build. Users can select from org PATs.

**What Users Can Do**: Create/edit build → Select saved PAT from dropdown → Save build → Build uses that PAT for API calls

**Implementation (Full Stack)**:
- **Database**: Add `patId` column to builds table (nullable FK to personalAccessTokens), migration
- **Build Repository**: Update `create()` and `update()` to accept and save `patId`
- **Build Use Cases**: Update `addBuild.ts` and `editBuild.ts` to accept patId, validate it exists in org
- **Token Resolution**: Create `TokenResolutionService` with `resolveToken()` - if patId exists, load PAT from DB, decrypt, update lastUsed; else use inline token
- **Fetch Stats**: Update `fetchBuildStats.ts` to use TokenResolutionService before GitHub client
- **Build Form UI**: Add "GitHub Token" dropdown above existing PAT field, fetch org PATs, format as "{name} (Last used: X)", on select store patId
- **Validation**: Require either patId OR inline token (not both)

**Testing**: E2E test - owner creates build with saved PAT, fetches stats successfully, PAT lastUsed updates

**Commit**: ✨ Add use saved PAT in build feature
```
---

# Review & Iteration

- Each step is small, testable, and builds on the previous.
- No orphaned code: every module is integrated before moving on.
- Early and frequent testing is prioritized.
- Prompts are ready for a code-generation LLM to implement in a test-driven, incremental manner.
