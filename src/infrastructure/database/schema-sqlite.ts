import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Tenants table
export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  slugIdx: uniqueIndex('idx_tenants_slug').on(table.slug),
}));

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name'),
  emailVerified: integer('email_verified', { mode: 'boolean' }).default(false),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  emailIdx: uniqueIndex('idx_users_email').on(table.email),
}));

// Sessions table (better-auth)
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdIdx: index('idx_sessions_user_id').on(table.userId),
  tokenIdx: uniqueIndex('idx_sessions_token').on(table.token),
  expiresAtIdx: index('idx_sessions_expires_at').on(table.expiresAt),
}));

// Accounts table (OAuth providers and credentials)
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(), // better-auth uses providerId
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  password: text('password'), // For email/password authentication
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  userIdIdx: index('idx_accounts_user_id').on(table.userId),
  providerIdx: index('idx_accounts_provider').on(table.providerId, table.accountId),
}));

// Verification tokens table
export const verificationTokens = sqliteTable('verification_tokens', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  tokenIdx: uniqueIndex('idx_verification_tokens_token').on(table.token),
}));

// Tenant members table
export const tenantMembers = sqliteTable('tenant_members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().$type<'owner' | 'admin' | 'member'>(),
  invitedBy: text('invited_by').references(() => users.id, { onDelete: 'set null' }),
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  tenantIdIdx: index('idx_tenant_members_tenant_id').on(table.tenantId),
  userIdIdx: index('idx_tenant_members_user_id').on(table.userId),
  roleIdx: index('idx_tenant_members_role').on(table.role),
  uniqueTenantUser: uniqueIndex('idx_tenant_members_unique').on(table.tenantId, table.userId),
}));

// Invitations table
export const invitations = sqliteTable('invitations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role').notNull().$type<'owner' | 'admin' | 'member'>(),
  token: text('token').notNull().unique(),
  invitedBy: text('invited_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  acceptedAt: integer('accepted_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  tenantIdIdx: index('idx_invitations_tenant_id').on(table.tenantId),
  emailIdx: index('idx_invitations_email').on(table.email),
  tokenIdx: uniqueIndex('idx_invitations_token').on(table.token),
  expiresAtIdx: index('idx_invitations_expires_at').on(table.expiresAt),
}));

// Builds table
export const builds = sqliteTable('builds', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  organization: text('organization').notNull(),
  repository: text('repository').notNull(),
  selectors: text('selectors', { mode: 'json' }).notNull().$defaultFn(() => []),
  mostUpdatedFiles: text('most_updated_files', { mode: 'json' }),
  monthlyCommits: text('monthly_commits', { mode: 'json' }),
  contributors: text('contributors', { mode: 'json' }),
  tags: text('tags', { mode: 'json' }),
  totalCommits: integer('total_commits'),
  totalContributors: integer('total_contributors'),
  lastAnalyzedCommitSha: text('last_analyzed_commit_sha'),
  accessTokenId: text('access_token_id').references(() => accessTokens.id, { onDelete: 'set null' }),
  personalAccessToken: text('personal_access_token'),
  label: text('label'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  tenantIdIdx: index('idx_builds_tenant_id').on(table.tenantId),
  organizationIdx: index('idx_builds_organization').on(table.organization),
  repositoryIdx: index('idx_builds_repository').on(table.repository),
  accessTokenIdIdx: index('idx_builds_access_token_id').on(table.accessTokenId),
  labelIdx: index('idx_builds_label').on(table.label),
  uniqueTenantName: uniqueIndex('idx_builds_unique').on(table.tenantId, table.name),
}));

// Access Tokens table
export const accessTokens = sqliteTable('access_tokens', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  encryptedToken: text('encrypted_token').notNull(),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'set null' }),
  lastUsed: integer('last_used', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  tenantIdIdx: index('idx_access_tokens_tenant_id').on(table.tenantId),
  uniqueTenantName: uniqueIndex('idx_access_tokens_unique').on(table.tenantId, table.name),
}));

// Workflow Runs table (historical build executions)
export const workflowRuns = sqliteTable('workflow_runs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  buildId: text('build_id').notNull().references(() => builds.id, { onDelete: 'cascade' }),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),

  // GitHub workflow run data
  githubRunId: integer('github_run_id').notNull(),
  name: text('name').notNull(),
  status: text('status').notNull().$type<'success' | 'failure' | 'cancelled' | 'in_progress' | 'queued'>(),
  conclusion: text('conclusion'),
  htmlUrl: text('html_url').notNull(),
  headBranch: text('head_branch'),
  event: text('event'),
  duration: integer('duration'), // milliseconds

  // Commit info
  commitSha: text('commit_sha').notNull(),
  commitMessage: text('commit_message'),
  commitAuthor: text('commit_author'),
  commitDate: integer('commit_date', { mode: 'timestamp' }),

  // Timestamps
  workflowCreatedAt: integer('workflow_created_at', { mode: 'timestamp' }).notNull(),
  workflowUpdatedAt: integer('workflow_updated_at', { mode: 'timestamp' }).notNull(),
  syncedAt: integer('synced_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  buildIdIdx: index('idx_workflow_runs_build_id').on(table.buildId),
  tenantIdIdx: index('idx_workflow_runs_tenant_id').on(table.tenantId),
  statusIdx: index('idx_workflow_runs_status').on(table.status),
  workflowCreatedAtIdx: index('idx_workflow_runs_workflow_created_at').on(table.workflowCreatedAt),
  buildIdWorkflowCreatedAtIdx: index('idx_workflow_runs_build_created').on(table.buildId, table.workflowCreatedAt),
  uniqueBuildGithubRun: uniqueIndex('idx_workflow_runs_unique').on(table.buildId, table.githubRunId),
}));

// Test Results table (parsed test results from workflow artifacts)
export const testResults = sqliteTable('test_results', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  workflowRunId: text('workflow_run_id').notNull().references(() => workflowRuns.id, { onDelete: 'cascade' }),
  buildId: text('build_id').notNull().references(() => builds.id, { onDelete: 'cascade' }),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),

  // Test summary
  totalTests: integer('total_tests').notNull(),
  passedTests: integer('passed_tests').notNull(),
  failedTests: integer('failed_tests').notNull(),
  skippedTests: integer('skipped_tests').notNull(),

  // Test details (JSON array of individual test cases)
  testCases: text('test_cases', { mode: 'json' }),

  // Metadata
  artifactName: text('artifact_name'),
  artifactUrl: text('artifact_url'),
  parsedAt: integer('parsed_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  workflowRunIdIdx: uniqueIndex('idx_test_results_workflow_run_id').on(table.workflowRunId),
  buildIdIdx: index('idx_test_results_build_id').on(table.buildId),
  tenantIdIdx: index('idx_test_results_tenant_id').on(table.tenantId),
  buildIdParsedAtIdx: index('idx_test_results_build_parsed').on(table.buildId, table.parsedAt),
}));

// Build Sync Status table (tracks sync progress per build)
export const buildSyncStatus = sqliteTable('build_sync_status', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  buildId: text('build_id').notNull().references(() => builds.id, { onDelete: 'cascade' }),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),

  lastSyncedAt: integer('last_synced_at', { mode: 'timestamp' }),
  lastSyncedRunId: integer('last_synced_run_id'),
  lastSyncedRunCreatedAt: integer('last_synced_run_created_at', { mode: 'timestamp' }),

  initialBackfillCompleted: integer('initial_backfill_completed', { mode: 'boolean' }).notNull().default(false),
  initialBackfillCompletedAt: integer('initial_backfill_completed_at', { mode: 'timestamp' }),

  totalRunsSynced: integer('total_runs_synced').notNull().default(0),
  lastSyncError: text('last_sync_error'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  buildIdIdx: uniqueIndex('idx_build_sync_status_build_id').on(table.buildId),
  tenantIdIdx: index('idx_build_sync_status_tenant_id').on(table.tenantId),
}));

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  members: many(tenantMembers),
  invitations: many(invitations),
  builds: many(builds),
  accessTokens: many(accessTokens),
  workflowRuns: many(workflowRuns),
  testResults: many(testResults),
  buildSyncStatuses: many(buildSyncStatus),
}));

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  tenantMembersList: many(tenantMembers, { relationName: "userMemberships" }),
  invitedMembers: many(tenantMembers, { relationName: "invitedMembers" }),
  invitationsSent: many(invitations, { relationName: "invitationsSent" }),
  createdTokens: many(accessTokens),
}));

export const tenantMembersRelations = relations(tenantMembers, ({ one }) => ({
  tenant: one(tenants, {
    fields: [tenantMembers.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [tenantMembers.userId],
    references: [users.id],
    relationName: "userMemberships",
  }),
  inviter: one(users, {
    fields: [tenantMembers.invitedBy],
    references: [users.id],
    relationName: "invitedMembers",
  }),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  tenant: one(tenants, {
    fields: [invitations.tenantId],
    references: [tenants.id],
  }),
  inviter: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
    relationName: "invitationsSent",
  }),
}));

export const buildsRelations = relations(builds, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [builds.tenantId],
    references: [tenants.id],
  }),
  workflowRuns: many(workflowRuns),
  testResults: many(testResults),
  syncStatus: one(buildSyncStatus),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const accessTokensRelations = relations(accessTokens, ({ one }) => ({
  tenant: one(tenants, {
    fields: [accessTokens.tenantId],
    references: [tenants.id],
  }),
  creator: one(users, {
    fields: [accessTokens.createdBy],
    references: [users.id],
  }),
}));

export const workflowRunsRelations = relations(workflowRuns, ({ one }) => ({
  build: one(builds, {
    fields: [workflowRuns.buildId],
    references: [builds.id],
  }),
  tenant: one(tenants, {
    fields: [workflowRuns.tenantId],
    references: [tenants.id],
  }),
  testResult: one(testResults),
}));

export const testResultsRelations = relations(testResults, ({ one }) => ({
  workflowRun: one(workflowRuns, {
    fields: [testResults.workflowRunId],
    references: [workflowRuns.id],
  }),
  build: one(builds, {
    fields: [testResults.buildId],
    references: [builds.id],
  }),
  tenant: one(tenants, {
    fields: [testResults.tenantId],
    references: [tenants.id],
  }),
}));

export const buildSyncStatusRelations = relations(buildSyncStatus, ({ one }) => ({
  build: one(builds, {
    fields: [buildSyncStatus.buildId],
    references: [builds.id],
  }),
  tenant: one(tenants, {
    fields: [buildSyncStatus.tenantId],
    references: [tenants.id],
  }),
}));
