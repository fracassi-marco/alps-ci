import { describe, it, expect, beforeEach } from 'bun:test';
import { InMemoryGitHubDataCache } from '../GitHubDataCache';
import type { WorkflowRun } from '../../domain/models';

describe('InMemoryGitHubDataCache', () => {
  let cache: InMemoryGitHubDataCache;

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
    {
      id: 2,
      name: 'CI',
      status: 'failure',
      conclusion: 'failure',
      htmlUrl: 'https://github.com/owner/repo/actions/runs/2',
      createdAt: new Date('2024-01-01T11:00:00Z'),
      updatedAt: new Date('2024-01-01T11:05:00Z'),
    },
  ];

  const mockTags = ['v1.2.0', 'v1.1.0', 'v1.0.0'];

  beforeEach(() => {
    cache = new InMemoryGitHubDataCache();
  });

  describe('workflow runs caching', () => {
    it('should cache and retrieve workflow runs', () => {
      cache.setWorkflowRuns('owner/repo/runs', mockWorkflowRuns);
      const cached = cache.getWorkflowRuns('owner/repo/runs');

      expect(cached).toBeDefined();
      expect(cached?.data).toEqual(mockWorkflowRuns);
      expect(cached?.cachedAt).toBeInstanceOf(Date);
    });

    it('should return null for non-existent cache key', () => {
      const cached = cache.getWorkflowRuns('non-existent');
      expect(cached).toBeNull();
    });

    it('should update existing cache', () => {
      cache.setWorkflowRuns('owner/repo/runs', mockWorkflowRuns);

      const newRuns: WorkflowRun[] = [mockWorkflowRuns[0]!];
      cache.setWorkflowRuns('owner/repo/runs', newRuns);

      const cached = cache.getWorkflowRuns('owner/repo/runs');
      expect(cached?.data).toHaveLength(1);
    });

    it('should cache multiple keys independently', () => {
      cache.setWorkflowRuns('owner/repo1/runs', mockWorkflowRuns);
      cache.setWorkflowRuns('owner/repo2/runs', [mockWorkflowRuns[0]!]);

      expect(cache.getWorkflowRuns('owner/repo1/runs')?.data).toHaveLength(2);
      expect(cache.getWorkflowRuns('owner/repo2/runs')?.data).toHaveLength(1);
    });
  });

  describe('tags caching', () => {
    it('should cache and retrieve tags', () => {
      cache.setTags('owner/repo/tags', mockTags);
      const cached = cache.getTags('owner/repo/tags');

      expect(cached).toBeDefined();
      expect(cached?.data).toEqual(mockTags);
      expect(cached?.cachedAt).toBeInstanceOf(Date);
    });

    it('should return null for non-existent cache key', () => {
      const cached = cache.getTags('non-existent');
      expect(cached).toBeNull();
    });

    it('should handle empty tags array', () => {
      cache.setTags('owner/repo/tags', []);
      const cached = cache.getTags('owner/repo/tags');

      expect(cached?.data).toEqual([]);
    });
  });

  describe('latest tag caching', () => {
    it('should cache and retrieve latest tag', () => {
      cache.setLatestTag('owner/repo/latest', 'v1.2.0');
      const cached = cache.getLatestTag('owner/repo/latest');

      expect(cached).toBeDefined();
      expect(cached?.data).toBe('v1.2.0');
      expect(cached?.cachedAt).toBeInstanceOf(Date);
    });

    it('should handle null latest tag', () => {
      cache.setLatestTag('owner/repo/latest', null);
      const cached = cache.getLatestTag('owner/repo/latest');

      expect(cached).toBeDefined();
      expect(cached?.data).toBeNull();
    });

    it('should return null for non-existent cache key', () => {
      const cached = cache.getLatestTag('non-existent');
      expect(cached).toBeNull();
    });
  });

  describe('invalidation', () => {
    beforeEach(() => {
      cache.setWorkflowRuns('owner/repo/runs', mockWorkflowRuns);
      cache.setTags('owner/repo/tags', mockTags);
      cache.setLatestTag('owner/repo/latest', 'v1.2.0');
    });

    it('should invalidate all data for a specific key', () => {
      cache.invalidate('owner/repo/runs');

      expect(cache.getWorkflowRuns('owner/repo/runs')).toBeNull();
      expect(cache.getTags('owner/repo/tags')).toBeDefined();
      expect(cache.getLatestTag('owner/repo/latest')).toBeDefined();
    });

    it('should invalidate by prefix', () => {
      cache.setWorkflowRuns('owner/repo1/runs', mockWorkflowRuns);
      cache.setWorkflowRuns('owner/repo2/runs', mockWorkflowRuns);
      cache.setTags('owner/repo1/tags', mockTags);

      cache.invalidateByPrefix('owner/repo1/');

      expect(cache.getWorkflowRuns('owner/repo1/runs')).toBeNull();
      expect(cache.getTags('owner/repo1/tags')).toBeNull();
      expect(cache.getWorkflowRuns('owner/repo2/runs')).toBeDefined();
    });

    it('should invalidate all cached data', () => {
      cache.invalidateAll();

      expect(cache.getWorkflowRuns('owner/repo/runs')).toBeNull();
      expect(cache.getTags('owner/repo/tags')).toBeNull();
      expect(cache.getLatestTag('owner/repo/latest')).toBeNull();
    });

    it('should clear all cached data', () => {
      cache.clear();

      const sizes = cache.size();
      expect(sizes.workflowRuns).toBe(0);
      expect(sizes.tags).toBe(0);
      expect(sizes.latestTags).toBe(0);
    });

    it('should not throw when invalidating non-existent key', () => {
      expect(() => cache.invalidate('non-existent')).not.toThrow();
    });

    it('should not throw when invalidating by non-matching prefix', () => {
      expect(() => cache.invalidateByPrefix('non-matching/')).not.toThrow();
    });
  });

  describe('cache timestamps', () => {
    it('should set current timestamp when caching workflow runs', () => {
      const before = new Date();
      cache.setWorkflowRuns('owner/repo/runs', mockWorkflowRuns);
      const after = new Date();

      const cached = cache.getWorkflowRuns('owner/repo/runs');
      expect(cached?.cachedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(cached?.cachedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should update timestamp when re-caching', async () => {
      cache.setWorkflowRuns('owner/repo/runs', mockWorkflowRuns);
      const firstCached = cache.getWorkflowRuns('owner/repo/runs');

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      cache.setWorkflowRuns('owner/repo/runs', mockWorkflowRuns);
      const secondCached = cache.getWorkflowRuns('owner/repo/runs');

      expect(secondCached?.cachedAt.getTime()).toBeGreaterThan(
        firstCached?.cachedAt.getTime() ?? 0
      );
    });
  });

  describe('size tracking', () => {
    it('should track cache sizes correctly', () => {
      expect(cache.size()).toEqual({ workflowRuns: 0, tags: 0, latestTags: 0 });

      cache.setWorkflowRuns('key1', mockWorkflowRuns);
      cache.setWorkflowRuns('key2', mockWorkflowRuns);
      cache.setTags('key3', mockTags);
      cache.setLatestTag('key4', 'v1.0.0');

      expect(cache.size()).toEqual({ workflowRuns: 2, tags: 1, latestTags: 1 });
    });

    it('should update size after invalidation', () => {
      cache.setWorkflowRuns('key1', mockWorkflowRuns);
      cache.setTags('key2', mockTags);

      cache.invalidate('key1');

      expect(cache.size().workflowRuns).toBe(0);
      expect(cache.size().tags).toBe(1);
    });
  });
});

