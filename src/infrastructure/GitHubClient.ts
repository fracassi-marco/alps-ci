import type { WorkflowRun } from '../domain/models';

export interface GitHubClient {

  fetchWorkflowRuns(
    owner: string,
    repo: string,
    filters?: {
      workflowName?: string;
      branch?: string;
      limit?: number;
      since?: Date;
      delayMs?: number;
    }
  ): Promise<WorkflowRun[]>;

  fetchTags(owner: string, repo: string, limit?: number): Promise<string[]>;

  fetchLatestTag(owner: string, repo: string): Promise<string | null>;

  fetchWorkflows(
    owner: string,
    repo: string
  ): Promise<Array<{ name: string; path: string; state: string }>>;

  validateToken(): Promise<boolean>;

  fetchCommits(
    owner: string,
    repo: string,
    since?: Date,
    until?: Date
  ): Promise<number>;

  fetchCommitsWithDates(
    owner: string,
    repo: string,
    since?: Date,
    until?: Date
  ): Promise<Array<{ date: Date }>>;

  fetchContributors(
    owner: string,
    repo: string,
    since?: Date
  ): Promise<number>;

  fetchTotalContributors(owner: string, repo: string): Promise<number>;

  fetchContributorsList(
    owner: string,
    repo: string,
    limit?: number
  ): Promise<
    Array<{
      login: string;
      name: string | null;
      avatarUrl: string;
      contributions: number;
      profileUrl: string;
    }>
  >;

  fetchLastCommit(
    owner: string,
    repo: string
  ): Promise<{
    message: string;
    date: Date;
    author: string;
    sha: string;
    url: string;
  } | null>;

  fetchArtifacts(
    owner: string,
    repo: string,
    runId: number
  ): Promise<Array<{ id: number; name: string; size_in_bytes: number }>>;

  downloadArtifact(
    owner: string,
    repo: string,
    artifactId: number
  ): Promise<string | null>;

  fetchMostActiveFiles(
    owner: string,
    repo: string,
    limit?: number
  ): Promise<Array<{ path: string; updateCount: number; lastUpdated: Date }>>;
}
