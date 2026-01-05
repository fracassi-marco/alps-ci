import type { WorkflowRun } from '../domain/models';

export interface CachedData<T> {
  data: T;
  cachedAt: Date;
}

export interface GitHubDataCache {
  getWorkflowRuns(key: string): CachedData<WorkflowRun[]> | null;
  setWorkflowRuns(key: string, runs: WorkflowRun[]): void;
  getTags(key: string): CachedData<string[]> | null;
  setTags(key: string, tags: string[]): void;
  getLatestTag(key: string): CachedData<string | null> | null;
  setLatestTag(key: string, tag: string | null): void;
  invalidate(key: string): void;
  invalidateByPrefix(prefix: string): void;
  invalidateAll(): void;
  clear(): void;
}

/**
 * In-memory cache for GitHub API responses.
 * Stores workflow runs, tags, and other GitHub data with timestamps.
 * Each Build can have its own cache expiration threshold.
 */
export class InMemoryGitHubDataCache implements GitHubDataCache {
  private workflowRunsCache = new Map<string, CachedData<WorkflowRun[]>>();
  private tagsCache = new Map<string, CachedData<string[]>>();
  private latestTagCache = new Map<string, CachedData<string | null>>();

  getWorkflowRuns(key: string): CachedData<WorkflowRun[]> | null {
    return this.workflowRunsCache.get(key) ?? null;
  }

  setWorkflowRuns(key: string, runs: WorkflowRun[]): void {
    this.workflowRunsCache.set(key, {
      data: runs,
      cachedAt: new Date(),
    });
  }

  getTags(key: string): CachedData<string[]> | null {
    return this.tagsCache.get(key) ?? null;
  }

  setTags(key: string, tags: string[]): void {
    this.tagsCache.set(key, {
      data: tags,
      cachedAt: new Date(),
    });
  }

  getLatestTag(key: string): CachedData<string | null> | null {
    return this.latestTagCache.get(key) ?? null;
  }

  setLatestTag(key: string, tag: string | null): void {
    this.latestTagCache.set(key, {
      data: tag,
      cachedAt: new Date(),
    });
  }

  invalidate(key: string): void {
    this.workflowRunsCache.delete(key);
    this.tagsCache.delete(key);
    this.latestTagCache.delete(key);
  }

  invalidateByPrefix(prefix: string): void {
    // Invalidate workflow runs with matching prefix
    for (const key of this.workflowRunsCache.keys()) {
      if (key.startsWith(prefix)) {
        this.workflowRunsCache.delete(key);
      }
    }

    // Invalidate tags with matching prefix
    for (const key of this.tagsCache.keys()) {
      if (key.startsWith(prefix)) {
        this.tagsCache.delete(key);
      }
    }

    // Invalidate latest tags with matching prefix
    for (const key of this.latestTagCache.keys()) {
      if (key.startsWith(prefix)) {
        this.latestTagCache.delete(key);
      }
    }
  }

  invalidateAll(): void {
    this.workflowRunsCache.clear();
    this.tagsCache.clear();
    this.latestTagCache.clear();
  }

  clear(): void {
    this.invalidateAll();
  }

  // Utility methods for debugging/testing
  size(): { workflowRuns: number; tags: number; latestTags: number } {
    return {
      workflowRuns: this.workflowRunsCache.size,
      tags: this.tagsCache.size,
      latestTags: this.latestTagCache.size,
    };
  }
}

