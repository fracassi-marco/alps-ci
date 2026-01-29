import { pgTable, uuid, varchar, timestamp, boolean, text, integer, jsonb, uniqueIndex, index, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const roleEnum = pgEnum('role', ['owner', 'admin', 'member']);

// Tenants table
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex('idx_tenants_slug').on(table.slug),
}));

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  emailVerified: boolean('email_verified').default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex('idx_users_email').on(table.email),
}));

// Sessions table (better-auth)
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_sessions_user_id').on(table.userId),
  tokenIdx: uniqueIndex('idx_sessions_token').on(table.token),
  expiresAtIdx: index('idx_sessions_expires_at').on(table.expiresAt),
}));

// Accounts table (OAuth providers and credentials)
export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(), // better-auth uses providerId
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  password: text('password'), // For email/password authentication
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_accounts_user_id').on(table.userId),
  providerIdx: index('idx_accounts_provider').on(table.providerId, table.accountId),
  providerUnique: uniqueIndex('idx_accounts_provider_unique').on(table.providerId, table.accountId),
}));

// Verification tokens table
export const verificationTokens = pgTable('verification_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tokenIdx: uniqueIndex('idx_verification_tokens_token').on(table.token),
}));

// Tenant members table
export const tenantMembers = pgTable('tenant_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull().$type<'owner' | 'admin' | 'member'>(),
  invitedBy: uuid('invited_by').references(() => users.id, { onDelete: 'set null' }),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index('idx_tenant_members_tenant_id').on(table.tenantId),
  userIdIdx: index('idx_tenant_members_user_id').on(table.userId),
  roleIdx: index('idx_tenant_members_role').on(table.role),
  uniqueTenantUser: uniqueIndex('idx_tenant_members_unique').on(table.tenantId, table.userId),
}));

// Invitations table
export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).notNull().$type<'owner' | 'admin' | 'member'>(),
  token: text('token').notNull().unique(),
  invitedBy: uuid('invited_by').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tenantIdIdx: index('idx_invitations_tenant_id').on(table.tenantId),
  emailIdx: index('idx_invitations_email').on(table.email),
  tokenIdx: uniqueIndex('idx_invitations_token').on(table.token),
  expiresAtIdx: index('idx_invitations_expires_at').on(table.expiresAt),
}));

// Builds table
export const builds = pgTable('builds', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  organization: varchar('organization', { length: 255 }).notNull(),
  repository: varchar('repository', { length: 255 }).notNull(),
  selectors: jsonb('selectors').notNull().default([]),
  personalAccessToken: text('personal_access_token').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
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

