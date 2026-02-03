import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { FetchBuildStatsFromDatabaseUseCase } from '@/use-cases/fetchBuildStatsFromDatabase';
import type { Build, WorkflowRunRecord, TestResultRecord } from '@/domain/models';
import type { GitHubClient } from '@/infrastructure/GitHubClient';

describe('FetchBuildStatsFromDatabaseUseCase', () => {
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

  const mockWorkflowRunRecord: WorkflowRunRecord = {
    id: 'run-123',
    buildId: 'build-123',
    tenantId,
    githubRunId: 123456,
    name: 'CI',
    status: 'success',
    conclusion: 'success',
    htmlUrl: 'https://github.com/test-org/test-repo/actions/runs/123456',
    headBranch: 'main',
    event: 'push',
    duration: 1800,
    commitSha: 'abc123',
    commitMessage: 'Test commit',
    commitAuthor: 'Test Author',
    commitDate: new Date('2024-01-01T10:00:00Z'),
    workflowCreatedAt: new Date('2024-01-01T10:00:00Z'),
    workflowUpdatedAt: new Date('2024-01-01T10:30:00Z'),
    syncedAt: new Date('2024-01-01T11:00:00Z'),
    createdAt: new Date('2024-01-01T11:00:00Z'),
    updatedAt: new Date('2024-01-01T11:00:00Z'),
  };

  const mockTestResultRecord: TestResultRecord = {
    id: 'test-123',
    workflowRunId: 'run-123',
    buildId: 'build-123',
    tenantId,
    totalTests: 10,
    passedTests: 8,
    failedTests: 2,
    skippedTests: 0,
    testCases: null,
    artifactName: 'test-results.xml',
    artifactUrl: 'https://github.com/test-org/test-repo/actions/runs/123456/artifacts/1',
    parsedAt: new Date('2024-01-01T11:00:00Z'),
    createdAt: new Date('2024-01-01T11:00:00Z'),
    updatedAt: new Date('2024-01-01T11:00:00Z'),
  };

  let mockWorkflowRunRepo: any;
  let mockTestResultRepo: any;
  let mockGithubClient: any;
  let mockBuildRepo: any;

  beforeEach(() => {
    mockWorkflowRunRepo = {
      findByBuildIdSince: mock(() => Promise.resolve([])),
    };

    mockTestResultRepo = {
      findByBuildId: mock(() => Promise.resolve([])),
    };

    mockGithubClient = {
      fetchLastCommit: mock(() => Promise.resolve(null)),
      fetchTags: mock(() => Promise.resolve([])),
      fetchCommits: mock(() => Promise.resolve(0)),
      fetchContributors: mock(() => Promise.resolve(0)),
      fetchTotalContributors: mock(() => Promise.resolve(0)),
    };

    mockBuildRepo = {
      update: mock(() => Promise.resolve()),
    };
  });

  it('should return build stats from database workflow runs', async () => {
    const runs = [mockWorkflowRunRecord];
    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue(runs);

    const useCase = new FetchBuildStatsFromDatabaseUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo
    );
    const result = await useCase.execute(mockBuild);

    expect(result.totalExecutions).toBe(1);
    expect(result.successfulExecutions).toBe(1);
    expect(result.failedExecutions).toBe(0);
    expect(result.healthPercentage).toBe(100);
    expect(result.recentRuns).toHaveLength(1);
    expect(result.recentRuns[0]?.id).toBe(123456);
  });

  it('should calculate health percentage correctly from database', async () => {
    const runs = [
      { ...mockWorkflowRunRecord, id: '1', githubRunId: 1, status: 'success' as const },
      { ...mockWorkflowRunRecord, id: '2', githubRunId: 2, status: 'failure' as const },
      { ...mockWorkflowRunRecord, id: '3', githubRunId: 3, status: 'success' as const },
      { ...mockWorkflowRunRecord, id: '4', githubRunId: 4, status: 'success' as const },
    ];
    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue(runs);

    const useCase = new FetchBuildStatsFromDatabaseUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo
    );
    const result = await useCase.execute(mockBuild);

    expect(result.totalExecutions).toBe(4);
    expect(result.successfulExecutions).toBe(3);
    expect(result.failedExecutions).toBe(1);
    expect(result.healthPercentage).toBe(75);
  });

  it('should fetch test stats from latest test result', async () => {
    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue([mockWorkflowRunRecord]);
    mockTestResultRepo.findByBuildId.mockResolvedValue([mockTestResultRecord]);

    const useCase = new FetchBuildStatsFromDatabaseUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo
    );
    const result = await useCase.execute(mockBuild);

    expect(result.testStats).not.toBeNull();
    expect(result.testStats?.totalTests).toBe(10);
    expect(result.testStats?.passedTests).toBe(8);
    expect(result.testStats?.failedTests).toBe(2);
    expect(result.testStats?.skippedTests).toBe(0);
  });

  it('should return null test stats when no test results found', async () => {
    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue([mockWorkflowRunRecord]);
    mockTestResultRepo.findByBuildId.mockResolvedValue([]);

    const useCase = new FetchBuildStatsFromDatabaseUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo
    );
    const result = await useCase.execute(mockBuild);

    expect(result.testStats).toBeNull();
  });

  it('should fetch GitHub metadata when client is provided', async () => {
    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue([mockWorkflowRunRecord]);
    mockGithubClient.fetchLastCommit.mockResolvedValue({
      sha: 'abc123',
      message: 'Test commit',
      author: 'Test Author',
      date: new Date('2024-01-01T10:00:00Z'),
      url: 'https://github.com/test-org/test-repo/commit/abc123',
    });
    mockGithubClient.fetchTags.mockResolvedValue(['v1.0.0', 'v2.0.0']);
    mockGithubClient.fetchCommits.mockImplementation((org: string, repo: string, since?: Date) => {
      return Promise.resolve(since ? 5 : 100);
    });
    mockGithubClient.fetchContributors.mockResolvedValue(3);
    mockGithubClient.fetchTotalContributors.mockResolvedValue(10);

    const useCase = new FetchBuildStatsFromDatabaseUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockGithubClient,
      mockBuildRepo
    );
    const result = await useCase.execute(mockBuild);

    expect(result.lastTag).toBe('v1.0.0');
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

  it('should use cached metadata when commit SHA matches', async () => {
    const buildWithCache: Build = {
      ...mockBuild,
      lastAnalyzedCommitSha: 'abc123',
      tags: ['v1.0.0', 'v2.0.0'],
      totalCommits: 100,
      totalContributors: 10,
      cachedCommitsLast7Days: 5,
      cachedContributorsLast7Days: 3,
    };

    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue([mockWorkflowRunRecord]);
    mockGithubClient.fetchLastCommit.mockResolvedValue({
      sha: 'abc123', // Same as cached
      message: 'Test commit',
      author: 'Test Author',
      date: new Date('2024-01-01T10:00:00Z'),
      url: 'https://github.com/test-org/test-repo/commit/abc123',
    });

    const useCase = new FetchBuildStatsFromDatabaseUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockGithubClient,
      mockBuildRepo
    );
    const result = await useCase.execute(buildWithCache);

    // Should use cached values
    expect(result.lastTag).toBe('v1.0.0');
    expect(result.totalCommits).toBe(100);
    expect(result.totalContributors).toBe(10);
    expect(result.commitsLast7Days).toBe(5);
    expect(result.contributorsLast7Days).toBe(3);

    // Should NOT call other GitHub API methods (only fetchLastCommit)
    expect(mockGithubClient.fetchTags).not.toHaveBeenCalled();
    expect(mockGithubClient.fetchCommits).not.toHaveBeenCalled();
    expect(mockGithubClient.fetchTotalContributors).not.toHaveBeenCalled();
  });

  it('should refresh metadata when commit SHA changes', async () => {
    const buildWithOldCache: Build = {
      ...mockBuild,
      lastAnalyzedCommitSha: 'old123',
      tags: ['v1.0.0'],
      totalCommits: 50,
      totalContributors: 5,
    };

    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue([mockWorkflowRunRecord]);
    mockGithubClient.fetchLastCommit.mockResolvedValue({
      sha: 'new456', // Different from cached
      message: 'New commit',
      author: 'Test Author',
      date: new Date('2024-01-02T10:00:00Z'),
      url: 'https://github.com/test-org/test-repo/commit/new456',
    });
    mockGithubClient.fetchTags.mockResolvedValue(['v1.0.0', 'v2.0.0']);
    mockGithubClient.fetchCommits.mockImplementation((org: string, repo: string, since?: Date) => {
      return Promise.resolve(since ? 10 : 120);
    });
    mockGithubClient.fetchContributors.mockResolvedValue(7);
    mockGithubClient.fetchTotalContributors.mockResolvedValue(15);

    const useCase = new FetchBuildStatsFromDatabaseUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockGithubClient,
      mockBuildRepo
    );
    const result = await useCase.execute(buildWithOldCache);

    // Should fetch fresh values
    expect(result.lastTag).toBe('v1.0.0');
    expect(result.totalCommits).toBe(120);
    expect(result.totalContributors).toBe(15);
    expect(result.commitsLast7Days).toBe(10);
    expect(result.contributorsLast7Days).toBe(7);

    // Should call all GitHub API methods
    expect(mockGithubClient.fetchTags).toHaveBeenCalled();
    expect(mockGithubClient.fetchCommits).toHaveBeenCalled();
    expect(mockGithubClient.fetchTotalContributors).toHaveBeenCalled();

    // Should update cache
    expect(mockBuildRepo.update).toHaveBeenCalledWith(
      mockBuild.id,
      expect.objectContaining({
        tags: ['v1.0.0', 'v2.0.0'],
        totalCommits: 120,
        totalContributors: 15,
        lastAnalyzedCommitSha: 'new456',
        cachedCommitsLast7Days: 10,
        cachedContributorsLast7Days: 7,
      }),
      tenantId
    );
  });

  it('should return empty stats when no workflow runs found', async () => {
    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue([]);

    const useCase = new FetchBuildStatsFromDatabaseUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo
    );
    const result = await useCase.execute(mockBuild);

    expect(result.totalExecutions).toBe(0);
    expect(result.successfulExecutions).toBe(0);
    expect(result.failedExecutions).toBe(0);
    expect(result.healthPercentage).toBe(0);
    expect(result.recentRuns).toHaveLength(0);
  });

  it('should build daily success data for last 7 days', async () => {
    const today = new Date();
    const runs = [
      { ...mockWorkflowRunRecord, id: '1', githubRunId: 1, status: 'success' as const, workflowCreatedAt: today },
      { ...mockWorkflowRunRecord, id: '2', githubRunId: 2, status: 'failure' as const, workflowCreatedAt: today },
      { ...mockWorkflowRunRecord, id: '3', githubRunId: 3, status: 'success' as const, workflowCreatedAt: today },
    ];
    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue(runs);

    const useCase = new FetchBuildStatsFromDatabaseUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo
    );
    const result = await useCase.execute(mockBuild);

    expect(result.last7DaysSuccesses).toHaveLength(7);
    expect(result.last7DaysSuccesses.every(day => day.date && typeof day.successCount === 'number' && typeof day.failureCount === 'number')).toBe(true);
  });

  it('should handle GitHub API errors gracefully', async () => {
    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue([mockWorkflowRunRecord]);
    mockGithubClient.fetchLastCommit.mockRejectedValue(new Error('GitHub API error'));

    const useCase = new FetchBuildStatsFromDatabaseUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockGithubClient,
      mockBuildRepo
    );
    const result = await useCase.execute(mockBuild);

    // Should still return database stats even if GitHub fails
    expect(result.totalExecutions).toBe(1);
    expect(result.successfulExecutions).toBe(1);
    // GitHub metadata will be null/0 due to error
    expect(result.lastCommit).toBeNull();
  });

  it('should return last 3 recent runs only', async () => {
    const runs = [
      { ...mockWorkflowRunRecord, id: '1', githubRunId: 1 },
      { ...mockWorkflowRunRecord, id: '2', githubRunId: 2 },
      { ...mockWorkflowRunRecord, id: '3', githubRunId: 3 },
      { ...mockWorkflowRunRecord, id: '4', githubRunId: 4 },
      { ...mockWorkflowRunRecord, id: '5', githubRunId: 5 },
    ];
    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue(runs);

    const useCase = new FetchBuildStatsFromDatabaseUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo
    );
    const result = await useCase.execute(mockBuild);

    expect(result.recentRuns).toHaveLength(3);
    expect(result.recentRuns[0]?.id).toBe(1);
    expect(result.recentRuns[1]?.id).toBe(2);
    expect(result.recentRuns[2]?.id).toBe(3);
  });
});
