import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { FetchBuildStatsUseCase } from '@/use-cases/fetchBuildStats';
import type { Build, WorkflowRun } from '@/domain/models';
import type { GitHubClient } from '@/infrastructure/GitHubClient';

describe('FetchBuildStatsUseCase', () => {
  const tenantId = 'tenant-123';
  
  const mockBuild: Build = {
    id: 'build-123',
    tenantId,
    name: 'Test Build',
    organization: 'test-org',
    repository: 'test-repo',
    personalAccessToken: 'ghp_token',
    selectors: [{ type: 'branch', pattern: 'main' }],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    accessTokenId: 'token-123',
  };

  const mockWorkflowRun: WorkflowRun = {
    id: 123456,
    name: 'CI',
    status: 'success',
    conclusion: 'success',
    htmlUrl: 'https://github.com/test-org/test-repo/actions/runs/123456',
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:30:00Z'),
    duration: 1800,
    headBranch: 'main',
    event: 'push',
  };

  let mockGithubClient: any;

  beforeEach(() => {
    mockGithubClient = {
      fetchWorkflowRuns: mock(() => Promise.resolve([])),
      fetchTags: mock(() => Promise.resolve([])),
      fetchLatestTag: mock(() => Promise.resolve(null)),
      fetchCommits: mock(() => Promise.resolve(0)),
      fetchContributors: mock(() => Promise.resolve(0)),
      fetchLastCommit: mock(() => Promise.resolve(null)),
      fetchTotalContributors: mock(() => Promise.resolve(0)),
      fetchArtifacts: mock(() => Promise.resolve([])),
    };
  });

  it('should return build stats with workflow runs', async () => {
    const runs = [mockWorkflowRun];
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue(runs);
    mockGithubClient.fetchLatestTag.mockResolvedValue('v1.0.0');
    mockGithubClient.fetchCommits.mockImplementation((org: string, repo: string, since?: Date) => {
      return Promise.resolve(since ? 5 : 100); // 5 commits last 7 days, 100 total
    });
    mockGithubClient.fetchContributors.mockResolvedValue(3);
    mockGithubClient.fetchTotalContributors.mockResolvedValue(10);
    mockGithubClient.fetchLastCommit.mockResolvedValue({
      sha: 'abc123',
      message: 'Test commit',
      author: 'Test Author',
      date: new Date('2024-01-01T10:00:00Z'),
      url: 'https://github.com/test-org/test-repo/commit/abc123',
    });

    const useCase = new FetchBuildStatsUseCase(mockGithubClient);
    const result = await useCase.execute(mockBuild);

    expect(result.totalExecutions).toBe(1);
    expect(result.successfulExecutions).toBe(1);
    expect(result.failedExecutions).toBe(0);
    expect(result.healthPercentage).toBe(100);
    expect(result.lastTag).toBe('v1.0.0');
    expect(result.recentRuns).toHaveLength(1);
    expect(result.commitsLast7Days).toBe(5);
    expect(result.contributorsLast7Days).toBe(3);
    expect(result.totalCommits).toBe(100);
    expect(result.totalContributors).toBe(10);
    expect(result.lastCommit).toEqual({
      sha: 'abc123',
      message: 'Test commit',
      author: 'Test Author',
      date: new Date('2024-01-01T10:00:00Z'),
      url: 'https://github.com/test-org/test-repo/commit/abc123',
    });
  });

  it('should calculate health percentage correctly', async () => {
    const runs = [
      { ...mockWorkflowRun, id: 1, status: 'success' },
      { ...mockWorkflowRun, id: 2, status: 'failure' },
      { ...mockWorkflowRun, id: 3, status: 'success' },
      { ...mockWorkflowRun, id: 4, status: 'success' },
    ];
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue(runs);

    const useCase = new FetchBuildStatsUseCase(mockGithubClient);
    const result = await useCase.execute(mockBuild);

    expect(result.totalExecutions).toBe(4);
    expect(result.successfulExecutions).toBe(3);
    expect(result.failedExecutions).toBe(1);
    expect(result.healthPercentage).toBe(75); // 3/4 = 75%
  });

  it('should filter workflow runs by branch selector', async () => {
    const runs = [
      { ...mockWorkflowRun, id: 1, headBranch: 'main' },
      { ...mockWorkflowRun, id: 2, headBranch: 'develop' },
      { ...mockWorkflowRun, id: 3, headBranch: 'main' },
    ];
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue(runs);

    const buildWithBranchSelector: Build = {
      ...mockBuild,
      selectors: [{ type: 'branch', pattern: 'main' }],
    };

    const useCase = new FetchBuildStatsUseCase(mockGithubClient);
    const result = await useCase.execute(buildWithBranchSelector);

    expect(result.totalExecutions).toBe(2); // Only main branch runs
  });

  it('should filter workflow runs by workflow name selector', async () => {
    const runs = [
      { ...mockWorkflowRun, id: 1, name: 'CI' },
      { ...mockWorkflowRun, id: 2, name: 'Deploy' },
      { ...mockWorkflowRun, id: 3, name: 'CI' },
    ];
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue(runs);

    const buildWithWorkflowSelector: Build = {
      ...mockBuild,
      selectors: [{ type: 'workflow', pattern: 'CI' }],
    };

    const useCase = new FetchBuildStatsUseCase(mockGithubClient);
    const result = await useCase.execute(buildWithWorkflowSelector);

    expect(result.totalExecutions).toBe(2); // Only CI workflow runs
  });

  it('should support wildcard patterns in selectors', async () => {
    const runs = [
      { ...mockWorkflowRun, id: 1, headBranch: 'feature/abc' },
      { ...mockWorkflowRun, id: 2, headBranch: 'feature/xyz' },
      { ...mockWorkflowRun, id: 3, headBranch: 'main' },
    ];
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue(runs);

    const buildWithWildcard: Build = {
      ...mockBuild,
      selectors: [{ type: 'branch', pattern: 'feature/*' }],
    };

    const useCase = new FetchBuildStatsUseCase(mockGithubClient);
    const result = await useCase.execute(buildWithWildcard);

    expect(result.totalExecutions).toBe(2); // Only feature/* branches
  });

  it('should filter workflow runs by tag selector', async () => {
    const runs = [
      { ...mockWorkflowRun, id: 1, headBranch: 'v1.0.0' },
      { ...mockWorkflowRun, id: 2, headBranch: 'main' },
      { ...mockWorkflowRun, id: 3, headBranch: 'refs/tags/v2.0.0' },
    ];
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue(runs);
    mockGithubClient.fetchTags.mockResolvedValue(['v1.0.0', 'v2.0.0']);

    const buildWithTagSelector: Build = {
      ...mockBuild,
      selectors: [{ type: 'tag', pattern: 'v*' }],
    };

    const useCase = new FetchBuildStatsUseCase(mockGithubClient);
    const result = await useCase.execute(buildWithTagSelector);

    expect(result.totalExecutions).toBe(2); // Only tag runs
  });

  it('should handle multiple selectors with OR logic', async () => {
    const runs = [
      { ...mockWorkflowRun, id: 1, headBranch: 'main', name: 'CI' },
      { ...mockWorkflowRun, id: 2, headBranch: 'develop', name: 'CI' },
      { ...mockWorkflowRun, id: 3, headBranch: 'feature/test', name: 'Deploy' },
    ];
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue(runs);

    const buildWithMultipleSelectors: Build = {
      ...mockBuild,
      selectors: [
        { type: 'branch', pattern: 'main' },
        { type: 'branch', pattern: 'develop' },
      ],
    };

    const useCase = new FetchBuildStatsUseCase(mockGithubClient);
    const result = await useCase.execute(buildWithMultipleSelectors);

    expect(result.totalExecutions).toBe(2); // main OR develop
  });

  it('should return empty stats when no workflow runs found', async () => {
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue([]);

    const useCase = new FetchBuildStatsUseCase(mockGithubClient);
    const result = await useCase.execute(mockBuild);

    expect(result.totalExecutions).toBe(0);
    expect(result.successfulExecutions).toBe(0);
    expect(result.failedExecutions).toBe(0);
    expect(result.healthPercentage).toBe(0);
    expect(result.recentRuns).toHaveLength(0);
  });

  it('should handle GitHub API errors gracefully', async () => {
    mockGithubClient.fetchWorkflowRuns.mockRejectedValue(new Error('GitHub API error'));

    const useCase = new FetchBuildStatsUseCase(mockGithubClient);

    await expect(useCase.execute(mockBuild)).rejects.toThrow('GitHub API error');
  });

  it('should build daily success data for last 7 days', async () => {
    const today = new Date();
    const runs = [
      { ...mockWorkflowRun, id: 1, status: 'success', createdAt: today },
      { ...mockWorkflowRun, id: 2, status: 'failure', createdAt: today },
      { ...mockWorkflowRun, id: 3, status: 'success', createdAt: today },
    ];
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue(runs);

    const useCase = new FetchBuildStatsUseCase(mockGithubClient);
    const result = await useCase.execute(mockBuild);

    expect(result.last7DaysSuccesses).toHaveLength(7);
    expect(result.last7DaysSuccesses.every(day => day.date && typeof day.successCount === 'number' && typeof day.failureCount === 'number')).toBe(true);
  });

  it('should fetch test stats from artifacts when available', async () => {
    const runs = [mockWorkflowRun];
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue(runs);
    mockGithubClient.fetchArtifacts.mockResolvedValue([
      { id: 1, name: 'test-results.xml', size_in_bytes: 1024 }
    ]);
    mockGithubClient.downloadArtifact = mock(() => Promise.resolve(`
      <?xml version="1.0" encoding="UTF-8"?>
      <testsuites tests="10" failures="2" skipped="1">
        <testsuite name="Suite 1" tests="10" failures="2" skipped="1">
        </testsuite>
      </testsuites>
    `));

    const useCase = new FetchBuildStatsUseCase(mockGithubClient);
    const result = await useCase.execute(mockBuild);

    expect(result.testStats).not.toBeNull();
    expect(result.testStats?.totalTests).toBe(10);
    expect(result.testStats?.failedTests).toBe(2);
    expect(result.testStats?.skippedTests).toBe(1);
    expect(result.testStats?.passedTests).toBe(7); // 10 - 2 - 1
  });

  it('should return null test stats when no artifacts found', async () => {
    const runs = [mockWorkflowRun];
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue(runs);
    mockGithubClient.fetchArtifacts.mockResolvedValue([]);

    const useCase = new FetchBuildStatsUseCase(mockGithubClient);
    const result = await useCase.execute(mockBuild);

    expect(result.testStats).toBeNull();
  });
});
