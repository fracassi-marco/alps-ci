import type { WorkflowRun } from '../domain/models';
import type { GitHubGraphQLClient } from './GitHubGraphQLClient';
import type { GitHubDataCache } from './GitHubDataCache';
import { isCacheExpired } from '../domain/validation';

/**
 * Cached GitHub client that wraps GitHubGraphQLClient and adds caching.
 * Respects per-Build cache expiration thresholds.
 */
export class CachedGitHubClient {
  constructor(
    private client: GitHubGraphQLClient,
    private cache: GitHubDataCache
  ) {}

  /**
   * Generates a cache key for a Build's GitHub data
   */
  private getCacheKey(owner: string, repo: string, suffix: string): string {
    return `${owner}/${repo}/${suffix}`;
  }

  /**
   * Checks if cached data is still valid based on cache expiration threshold
   */
  private isCacheValid<T>(
    cached: { data: T; cachedAt: Date } | null,
    cacheExpirationMinutes: number
  ): cached is { data: T; cachedAt: Date } {
    if (!cached) {
      return false;
    }

    return !isCacheExpired(cached.cachedAt, cacheExpirationMinutes);
  }

  /**
   * Fetches workflow runs with caching support
   */
  async fetchWorkflowRuns(
    owner: string,
    repo: string,
    cacheExpirationMinutes: number,
    filters?: {
      workflowName?: string;
      branch?: string;
      limit?: number;
      since?: Date;
    }
  ): Promise<WorkflowRun[]> {
    const cacheKey = this.getCacheKey(
      owner,
      repo,
      `workflow-runs:${JSON.stringify(filters || {})}`
    );

    // Check cache first
    const cached = this.cache.getWorkflowRuns(cacheKey);
    if (this.isCacheValid(cached, cacheExpirationMinutes)) {
      return cached.data;
    }

    // Cache miss or expired, fetch from API
    const runs = await this.client.fetchWorkflowRuns(owner, repo, filters);

    // Cache the result
    this.cache.setWorkflowRuns(cacheKey, runs);

    return runs;
  }

  /**
   * Fetches tags with caching support
   */
  async fetchTags(
    owner: string,
    repo: string,
    cacheExpirationMinutes: number,
    limit = 100
  ): Promise<string[]> {
    const cacheKey = this.getCacheKey(owner, repo, `tags:${limit}`);

    // Check cache first
    const cached = this.cache.getTags(cacheKey);
    if (this.isCacheValid(cached, cacheExpirationMinutes)) {
      return cached.data;
    }

    // Cache miss or expired, fetch from API
    const tags = await this.client.fetchTags(owner, repo, limit);

    // Cache the result
    this.cache.setTags(cacheKey, tags);

    return tags;
  }

  /**
   * Fetches latest tag with caching support
   */
  async fetchLatestTag(
    owner: string,
    repo: string,
    cacheExpirationMinutes: number
  ): Promise<string | null> {
    const cacheKey = this.getCacheKey(owner, repo, 'latest-tag');

    // Check cache first
    const cached = this.cache.getLatestTag(cacheKey);
    if (this.isCacheValid(cached, cacheExpirationMinutes)) {
      return cached.data;
    }

    // Cache miss or expired, fetch from API
    const tag = await this.client.fetchLatestTag(owner, repo);

    // Cache the result
    this.cache.setLatestTag(cacheKey, tag);

    return tag;
  }

  /**
   * Fetches workflows (not cached as this list rarely changes and is small)
   */
  async fetchWorkflows(
    owner: string,
    repo: string
  ): Promise<Array<{ name: string; path: string; state: string }>> {
    return this.client.fetchWorkflows(owner, repo);
  }

  /**
   * Validates token (not cached)
   */
  async validateToken(): Promise<boolean> {
    return this.client.validateToken();
  }

  /**
   * Invalidates all cached data for a specific repository
   */
  invalidateRepository(owner: string, repo: string): void {
    const prefix = `${owner}/${repo}/`;
    this.cache.invalidateByPrefix(prefix);
  }

  /**
   * Invalidates all cached data
   */
  invalidateAll(): void {
    this.cache.invalidateAll();
  }

  /**
   * Forces a refresh by invalidating cache and fetching fresh data
   */
  async refreshWorkflowRuns(
    owner: string,
    repo: string,
    filters?: {
      workflowName?: string;
      branch?: string;
      limit?: number;
      since?: Date;
    }
  ): Promise<WorkflowRun[]> {
    const cacheKey = this.getCacheKey(
      owner,
      repo,
      `workflow-runs:${JSON.stringify(filters || {})}`
    );

    // Invalidate existing cache
    this.cache.invalidate(cacheKey);

    // Fetch fresh data
    const runs = await this.client.fetchWorkflowRuns(owner, repo, filters);

    // Cache the new data
    this.cache.setWorkflowRuns(cacheKey, runs);

    return runs;
  }

  /**
   * Forces a refresh of tags
   */
  async refreshTags(owner: string, repo: string, limit = 100): Promise<string[]> {
    const cacheKey = this.getCacheKey(owner, repo, `tags:${limit}`);

    // Invalidate existing cache
    this.cache.invalidate(cacheKey);

    // Fetch fresh data
    const tags = await this.client.fetchTags(owner, repo, limit);

    // Cache the new data
    this.cache.setTags(cacheKey, tags);

    return tags;
  }

  /**
   * Forces a refresh of latest tag
   */
  async refreshLatestTag(owner: string, repo: string): Promise<string | null> {
    const cacheKey = this.getCacheKey(owner, repo, 'latest-tag');

    // Invalidate existing cache
    this.cache.invalidate(cacheKey);

    // Fetch fresh data
    const tag = await this.client.fetchLatestTag(owner, repo);

    // Cache the new data
    this.cache.setLatestTag(cacheKey, tag);

    return tag;
  }

  /**
   * Fetches commit count with caching support
   */
  async fetchCommits(
    owner: string,
    repo: string,
    cacheExpirationMinutes: number,
    since?: Date,
    until?: Date
  ): Promise<number> {
    const cacheKey = this.getCacheKey(
      owner,
      repo,
      `commits:${since?.toISOString() || 'all'}:${until?.toISOString() || 'now'}`
    );

    // Check cache first
    const cached = this.cache.getWorkflowRuns(cacheKey);
    if (this.isCacheValid(cached, cacheExpirationMinutes)) {
      return cached.data as any;
    }

    // Cache miss or expired, fetch from API
    const count = await this.client.fetchCommits(owner, repo, since, until);

    // Cache the result
    this.cache.setWorkflowRuns(cacheKey, count as any);

    return count;
  }

  /**
   * Fetches contributor count with caching support
   */
  async fetchContributors(
    owner: string,
    repo: string,
    cacheExpirationMinutes: number,
    since?: Date
  ): Promise<number> {
    const cacheKey = this.getCacheKey(
      owner,
      repo,
      `contributors:${since?.toISOString() || 'all'}`
    );

    // Check cache first
    const cached = this.cache.getWorkflowRuns(cacheKey);
    if (this.isCacheValid(cached, cacheExpirationMinutes)) {
      return cached.data as any;
    }

    // Cache miss or expired, fetch from API
    const count = await this.client.fetchContributors(owner, repo, since);

    // Cache the result
    this.cache.setWorkflowRuns(cacheKey, count as any);

    return count;
  }
}

