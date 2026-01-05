import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { CachedGitHubClient } from '../CachedGitHubClient';
import { InMemoryGitHubDataCache } from '../GitHubDataCache';
import type { GitHubGraphQLClient } from '../GitHubGraphQLClient';
import type { WorkflowRun } from '../../domain/models';

describe('CachedGitHubClient', () => {
  let cachedClient: CachedGitHubClient;
  let cache: InMemoryGitHubDataCache;
  let mockClient: GitHubGraphQLClient;

  const mockWorkflowRuns: WorkflowRun[] = [
    {
      id: 1,
      name: 'CI',
      status: 'success',
      conclusion: 'success',
      htmlUrl: 'https://github.com/owner/repo/actions/runs/1',
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:05:00Z'),
    },
  ];

  const mockTags = ['v1.2.0', 'v1.1.0'];

  beforeEach(() => {
    cache = new InMemoryGitHubDataCache();

    mockClient = {
      fetchWorkflowRuns: mock(() => Promise.resolve(mockWorkflowRuns)),
      fetchTags: mock(() => Promise.resolve(mockTags)),
      fetchLatestTag: mock(() => Promise.resolve('v1.2.0')),
      fetchWorkflows: mock(() => Promise.resolve([])),
      validateToken: mock(() => Promise.resolve(true)),
    } as any;

    cachedClient = new CachedGitHubClient(mockClient, cache);
  });

  describe('fetchWorkflowRuns with caching', () => {
    it('should fetch from API on cache miss', async () => {
      const runs = await cachedClient.fetchWorkflowRuns('owner', 'repo', 30);

      expect(runs).toEqual(mockWorkflowRuns);
      expect(mockClient.fetchWorkflowRuns).toHaveBeenCalledTimes(1);
    });

    it('should return cached data when valid', async () => {
      // First call - cache miss
      await cachedClient.fetchWorkflowRuns('owner', 'repo', 30);

      // Second call - cache hit
      const runs = await cachedClient.fetchWorkflowRuns('owner', 'repo', 30);

      expect(runs).toEqual(mockWorkflowRuns);
      expect(mockClient.fetchWorkflowRuns).toHaveBeenCalledTimes(1); // Only called once
    });

    it('should fetch fresh data when cache is expired', async () => {
      // First call
      await cachedClient.fetchWorkflowRuns('owner', 'repo', 30);

      // Manually expire the cache
      const cacheKey = 'owner/repo/workflow-runs:{}';
      const cached = cache.getWorkflowRuns(cacheKey);
      if (cached) {
        const expiredDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
        cache.setWorkflowRuns(cacheKey, cached.data);
        // Manually update the timestamp
        (cache as any).workflowRunsCache.set(cacheKey, {
          data: cached.data,
          cachedAt: expiredDate,
        });
      }

      // Second call with short expiration - should fetch fresh
      const runs = await cachedClient.fetchWorkflowRuns('owner', 'repo', 30);

      expect(runs).toEqual(mockWorkflowRuns);
      expect(mockClient.fetchWorkflowRuns).toHaveBeenCalledTimes(2); // Called twice
    });

    it('should respect different cache expiration thresholds', async () => {
      // First call
      await cachedClient.fetchWorkflowRuns('owner', 'repo', 60);

      // Set cache to 10 minutes ago
      const cacheKey = 'owner/repo/workflow-runs:{}';
      const cached = cache.getWorkflowRuns(cacheKey);
      if (cached) {
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        (cache as any).workflowRunsCache.set(cacheKey, {
          data: cached.data,
          cachedAt: tenMinutesAgo,
        });
      }

      // Should be valid with 60-minute threshold
      await cachedClient.fetchWorkflowRuns('owner', 'repo', 60);
      expect(mockClient.fetchWorkflowRuns).toHaveBeenCalledTimes(1);

      // Should be expired with 5-minute threshold
      await cachedClient.fetchWorkflowRuns('owner', 'repo', 5);
      expect(mockClient.fetchWorkflowRuns).toHaveBeenCalledTimes(2);
    });

    it('should cache different filter combinations separately', async () => {
      await cachedClient.fetchWorkflowRuns('owner', 'repo', 30, { branch: 'main' });
      await cachedClient.fetchWorkflowRuns('owner', 'repo', 30, { branch: 'develop' });
      await cachedClient.fetchWorkflowRuns('owner', 'repo', 30);

      expect(mockClient.fetchWorkflowRuns).toHaveBeenCalledTimes(3);

      // Fetch again with same filters - should use cache
      await cachedClient.fetchWorkflowRuns('owner', 'repo', 30, { branch: 'main' });
      expect(mockClient.fetchWorkflowRuns).toHaveBeenCalledTimes(3); // No additional call
    });
  });

  describe('fetchTags with caching', () => {
    it('should fetch from API on cache miss', async () => {
      const tags = await cachedClient.fetchTags('owner', 'repo', 30);

      expect(tags).toEqual(mockTags);
      expect(mockClient.fetchTags).toHaveBeenCalledTimes(1);
    });

    it('should return cached data when valid', async () => {
      await cachedClient.fetchTags('owner', 'repo', 30);
      const tags = await cachedClient.fetchTags('owner', 'repo', 30);

      expect(tags).toEqual(mockTags);
      expect(mockClient.fetchTags).toHaveBeenCalledTimes(1);
    });

    it('should cache different limits separately', async () => {
      await cachedClient.fetchTags('owner', 'repo', 30, 10);
      await cachedClient.fetchTags('owner', 'repo', 30, 100);

      expect(mockClient.fetchTags).toHaveBeenCalledTimes(2);
    });
  });

  describe('fetchLatestTag with caching', () => {
    it('should fetch from API on cache miss', async () => {
      const tag = await cachedClient.fetchLatestTag('owner', 'repo', 30);

      expect(tag).toBe('v1.2.0');
      expect(mockClient.fetchLatestTag).toHaveBeenCalledTimes(1);
    });

    it('should return cached data when valid', async () => {
      await cachedClient.fetchLatestTag('owner', 'repo', 30);
      const tag = await cachedClient.fetchLatestTag('owner', 'repo', 30);

      expect(tag).toBe('v1.2.0');
      expect(mockClient.fetchLatestTag).toHaveBeenCalledTimes(1);
    });

    it('should handle null latest tag', async () => {
      mockClient.fetchLatestTag = mock(() => Promise.resolve(null));
      cachedClient = new CachedGitHubClient(mockClient, cache);

      const tag = await cachedClient.fetchLatestTag('owner', 'repo', 30);
      expect(tag).toBeNull();

      // Should cache null value
      const tag2 = await cachedClient.fetchLatestTag('owner', 'repo', 30);
      expect(tag2).toBeNull();
      expect(mockClient.fetchLatestTag).toHaveBeenCalledTimes(1);
    });
  });

  describe('fetchWorkflows (not cached)', () => {
    it('should always fetch from API', async () => {
      await cachedClient.fetchWorkflows('owner', 'repo');
      await cachedClient.fetchWorkflows('owner', 'repo');

      expect(mockClient.fetchWorkflows).toHaveBeenCalledTimes(2);
    });
  });

  describe('validateToken (not cached)', () => {
    it('should always validate from API', async () => {
      await cachedClient.validateToken();
      await cachedClient.validateToken();

      expect(mockClient.validateToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidation', () => {
    it('should invalidate cache for a specific repository', async () => {
      await cachedClient.fetchWorkflowRuns('owner', 'repo', 30);
      await cachedClient.fetchTags('owner', 'repo', 30);

      cachedClient.invalidateRepository('owner', 'repo');

      // Next calls should fetch from API
      await cachedClient.fetchWorkflowRuns('owner', 'repo', 30);
      await cachedClient.fetchTags('owner', 'repo', 30);

      expect(mockClient.fetchWorkflowRuns).toHaveBeenCalledTimes(2);
      expect(mockClient.fetchTags).toHaveBeenCalledTimes(2);
    });

    it('should invalidate all cached data', async () => {
      await cachedClient.fetchWorkflowRuns('owner1', 'repo1', 30);
      await cachedClient.fetchWorkflowRuns('owner2', 'repo2', 30);

      cachedClient.invalidateAll();

      await cachedClient.fetchWorkflowRuns('owner1', 'repo1', 30);
      await cachedClient.fetchWorkflowRuns('owner2', 'repo2', 30);

      expect(mockClient.fetchWorkflowRuns).toHaveBeenCalledTimes(4);
    });
  });

  describe('refresh methods', () => {
    it('should force refresh workflow runs', async () => {
      await cachedClient.fetchWorkflowRuns('owner', 'repo', 30);

      const newRuns = await cachedClient.refreshWorkflowRuns('owner', 'repo');

      expect(newRuns).toEqual(mockWorkflowRuns);
      expect(mockClient.fetchWorkflowRuns).toHaveBeenCalledTimes(2);

      // Should now have fresh cache
      await cachedClient.fetchWorkflowRuns('owner', 'repo', 30);
      expect(mockClient.fetchWorkflowRuns).toHaveBeenCalledTimes(2); // No additional call
    });

    it('should force refresh tags', async () => {
      await cachedClient.fetchTags('owner', 'repo', 30);

      const newTags = await cachedClient.refreshTags('owner', 'repo');

      expect(newTags).toEqual(mockTags);
      expect(mockClient.fetchTags).toHaveBeenCalledTimes(2);
    });

    it('should force refresh latest tag', async () => {
      await cachedClient.fetchLatestTag('owner', 'repo', 30);

      const newTag = await cachedClient.refreshLatestTag('owner', 'repo');

      expect(newTag).toBe('v1.2.0');
      expect(mockClient.fetchLatestTag).toHaveBeenCalledTimes(2);
    });
  });

  describe('error handling', () => {
    it('should propagate API errors without caching', async () => {
      mockClient.fetchWorkflowRuns = mock(() =>
        Promise.reject(new Error('API Error'))
      );
      cachedClient = new CachedGitHubClient(mockClient, cache);

      await expect(
        cachedClient.fetchWorkflowRuns('owner', 'repo', 30)
      ).rejects.toThrow('API Error');

      // Should still have empty cache
      expect(cache.size().workflowRuns).toBe(0);
    });

    it('should fetch fresh data after error if cache exists', async () => {
      // First successful call
      await cachedClient.fetchWorkflowRuns('owner', 'repo', 30);

      // Mock an error for next call, but cache should still be valid
      mockClient.fetchWorkflowRuns = mock(() =>
        Promise.reject(new Error('API Error'))
      );

      // Should return cached data
      const runs = await cachedClient.fetchWorkflowRuns('owner', 'repo', 30);
      expect(runs).toEqual(mockWorkflowRuns);
    });
  });

  describe('cache key generation', () => {
    it('should generate unique keys for different repos', async () => {
      await cachedClient.fetchWorkflowRuns('owner1', 'repo1', 30);
      await cachedClient.fetchWorkflowRuns('owner2', 'repo2', 30);

      expect(mockClient.fetchWorkflowRuns).toHaveBeenCalledTimes(2);
    });

    it('should generate unique keys for different data types', async () => {
      await cachedClient.fetchWorkflowRuns('owner', 'repo', 30);
      await cachedClient.fetchTags('owner', 'repo', 30);
      await cachedClient.fetchLatestTag('owner', 'repo', 30);

      expect(mockClient.fetchWorkflowRuns).toHaveBeenCalledTimes(1);
      expect(mockClient.fetchTags).toHaveBeenCalledTimes(1);
      expect(mockClient.fetchLatestTag).toHaveBeenCalledTimes(1);

      // All should be cached now
      await cachedClient.fetchWorkflowRuns('owner', 'repo', 30);
      await cachedClient.fetchTags('owner', 'repo', 30);
      await cachedClient.fetchLatestTag('owner', 'repo', 30);

      // No additional API calls
      expect(mockClient.fetchWorkflowRuns).toHaveBeenCalledTimes(1);
      expect(mockClient.fetchTags).toHaveBeenCalledTimes(1);
      expect(mockClient.fetchLatestTag).toHaveBeenCalledTimes(1);
    });
  });
});

