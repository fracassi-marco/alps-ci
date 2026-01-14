// Selector types
export type SelectorType = 'tag' | 'branch' | 'workflow';

export interface Selector {
  type: SelectorType;
  pattern: string; // Free text pattern (e.g., "vX.Y.Z", "main", "CI-Workflow")
}

// Authentication and Multi-Tenant types

export type Role = 'owner' | 'admin' | 'member';

export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantMember {
  id: string;
  tenantId: string;
  userId: string;
  role: Role;
  invitedBy: string | null;
  joinedAt: Date;
  createdAt: Date;
}

export interface Invitation {
  id: string;
  tenantId: string;
  email: string;
  role: Role;
  token: string;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

// Access Token (GitHub PAT)
export interface AccessToken {
  id: string;
  tenantId: string;
  name: string;
  encryptedToken: string; // Never expose in API responses
  createdBy: string;
  lastUsed: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Access Token response (without encrypted token)
export interface AccessTokenResponse {
  id: string;
  tenantId: string;
  name: string;
  createdBy: string;
  createdByName?: string; // Populated with user name from join
  lastUsed: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Build configuration
export interface Build {
  id: string;
  tenantId: string; // Required - builds are always tenant-scoped
  name: string;
  organization: string;
  repository: string;
  selectors: Selector[];
  personalAccessToken: string;
  cacheExpirationMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

// Workflow run status
export type WorkflowRunStatus = 'success' | 'failure' | 'cancelled' | 'in_progress' | 'queued';

// Workflow run metadata
export interface WorkflowRun {
  id: number;
  name: string;
  status: WorkflowRunStatus;
  conclusion: string | null;
  htmlUrl: string;
  createdAt: Date;
  updatedAt: Date;
  duration?: number; // in milliseconds
  headBranch?: string; // The branch or tag that triggered the run
  event?: string; // The event that triggered the run (push, pull_request, etc.)
}

// Commit details
export interface CommitDetails {
  message: string;
  date: Date;
  author: string;
  sha: string;
  url: string;
}

// Build statistics
export interface BuildStats {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  healthPercentage: number;
  lastTag: string | null;
  last7DaysSuccesses: DailySuccess[];
  recentRuns: WorkflowRun[];
  lastFetchedAt: Date;
  commitsLast7Days: number;
  contributorsLast7Days: number;
  lastCommit: CommitDetails | null;
  totalCommits: number;
  totalContributors: number;
}

// Daily success and failure count for stacked bar chart
export interface DailySuccess {
  date: string; // ISO date string (YYYY-MM-DD)
  successCount: number;
  failureCount?: number;
}

// Build with statistics
export interface BuildWithStats extends Build {
  stats: BuildStats | null;
  error: string | null;
}
