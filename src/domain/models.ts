// Selector types
export type SelectorType = 'tag' | 'branch' | 'workflow';

export interface Selector {
  type: SelectorType;
  pattern: string; // Free text pattern (e.g., "vX.Y.Z", "main", "CI-Workflow")
}

// Build configuration
export interface Build {
  id: string;
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

