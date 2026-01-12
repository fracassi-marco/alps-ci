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
  personalAccessToken: text('personal_access_token').notNull(),
  cacheExpirationMinutes: integer('cache_expiration_minutes').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  tenantIdIdx: index('idx_builds_tenant_id').on(table.tenantId),
  organizationIdx: index('idx_builds_organization').on(table.organization),
  repositoryIdx: index('idx_builds_repository').on(table.repository),
  uniqueTenantName: uniqueIndex('idx_builds_unique').on(table.tenantId, table.name),
}));

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  members: many(tenantMembers),
  invitations: many(invitations),
  builds: many(builds),
}));

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  tenantMembersList: many(tenantMembers, { relationName: "userMemberships" }),
  invitedMembers: many(tenantMembers, { relationName: "invitedMembers" }),
  invitationsSent: many(invitations, { relationName: "invitationsSent" }),
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

export const buildsRelations = relations(builds, ({ one }) => ({
  tenant: one(tenants, {
    fields: [builds.tenantId],
    references: [tenants.id],
  }),
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

