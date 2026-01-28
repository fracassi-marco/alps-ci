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
  label?: string | null;
  selectors: Selector[];
  accessTokenId: string | null;
  personalAccessToken: string | null;
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
  testStats: TestStats | null;
}

export interface TestStats {
  totalTests: number;
  failedTests: number;
  passedTests: number;
  skippedTests: number;
}

// Daily success and failure count for stacked bar chart
export interface DailySuccess {
  date: string; // ISO date string (YYYY-MM-DD)
  successCount: number;
  failureCount?: number;
}

// Monthly success and failure count for monthly bar chart
export interface MonthlyBuildStats {
  month: string; // ISO month string (YYYY-MM)
  successCount: number;
  failureCount: number;
  totalCount: number;
}

// Monthly commit count for commit activity chart
export interface MonthlyCommitStats {
  month: string; // ISO month string (YYYY-MM)
  commitCount: number;
}

// Test trend data point (individual test run)
export interface TestTrendDataPoint {
  date: Date; // When the test was parsed/run
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
}

// Contributor information
export interface Contributor {
  login: string;
  name: string | null;
  avatarUrl: string;
  contributions: number;
  profileUrl: string;
}

// Build with statistics
export interface BuildWithStats extends Build {
  stats: BuildStats | null;
  error: string | null;
}

// Build details statistics (extended stats with monthly data)
export interface BuildDetailsStats extends BuildStats {
  monthlyStats: MonthlyBuildStats[]; // Last 12 months
  monthlyCommits: MonthlyCommitStats[]; // Last 12 months of commits
  testTrend: TestTrendDataPoint[]; // All test runs over time
  contributors: Contributor[]; // List of contributors ordered by contributions
}

// Workflow Run Record (historical workflow execution data)
export interface WorkflowRunRecord {
  id: string;
  buildId: string;
  tenantId: string;
  githubRunId: number;
  name: string;
  status: WorkflowRunStatus;
  conclusion: string | null;
  htmlUrl: string;
  headBranch: string | null;
  event: string | null;
  duration: number | null; // milliseconds
  commitSha: string;
  commitMessage: string | null;
  commitAuthor: string | null;
  commitDate: Date | null;
  workflowCreatedAt: Date;
  workflowUpdatedAt: Date;
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Test Case (individual test result)
export interface TestCase {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number | null; // milliseconds
  file: string | null;
  suite: string | null;
  error: string | null;
}

// Test Result Record (parsed test results from artifacts)
export interface TestResultRecord {
  id: string;
  workflowRunId: string;
  buildId: string;
  tenantId: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  testCases: TestCase[] | null;
  artifactName: string | null;
  artifactUrl: string | null;
  parsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Build Sync Status (tracks sync progress per build)
export interface BuildSyncStatus {
  id: string;
  buildId: string;
  tenantId: string;
  lastSyncedAt: Date | null;
  lastSyncedRunId: number | null;
  lastSyncedRunCreatedAt: Date | null;
  initialBackfillCompleted: boolean;
  initialBackfillCompletedAt: Date | null;
  totalRunsSynced: number;
  lastSyncError: string | null;
  createdAt: Date;
  updatedAt: Date;
}
