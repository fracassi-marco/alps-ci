import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { FetchBuildDetailsStatsUseCase } from '@/use-cases/fetchBuildDetailsStats';
import type { Build, WorkflowRunRecord, TestResultRecord } from '@/domain/models';
import type { GitHubClient } from '@/infrastructure/GitHubClient';

describe('FetchBuildDetailsStatsUseCase', () => {
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
  let mockBuildRepo: any;
  let mockGithubClient: any;

  beforeEach(() => {
    mockWorkflowRunRepo = {
      findByBuildIdSince: mock(() => Promise.resolve([])),
      findByBuildIdInDateRange: mock(() => Promise.resolve([])),
    };

    mockTestResultRepo = {
      findByBuildId: mock(() => Promise.resolve([])),
      findByWorkflowRunId: mock(() => Promise.resolve(null)),
    };

    mockBuildRepo = {
      update: mock(() => Promise.resolve()),
    };

    mockGithubClient = {
      fetchLastCommit: mock(() => Promise.resolve(null)),
      fetchTags: mock(() => Promise.resolve([])),
      fetchCommits: mock(() => Promise.resolve(0)),
      fetchContributors: mock(() => Promise.resolve(0)),
      fetchTotalContributors: mock(() => Promise.resolve(0)),
      fetchContributorsList: mock(() => Promise.resolve([])),
      fetchMostActiveFiles: mock(() => Promise.resolve([])),
      fetchCommitsWithDates: mock(() => Promise.resolve([])),
    };
  });

  it('should return extended build stats with monthly aggregations', async () => {
    const runs = [mockWorkflowRunRecord];
    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue(runs);
    mockWorkflowRunRepo.findByBuildIdInDateRange.mockResolvedValue(runs);

    const useCase = new FetchBuildDetailsStatsUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockBuildRepo
    );
    const result = await useCase.execute(mockBuild);

    expect(result.totalExecutions).toBe(1);
    expect(result.monthlyStats).toBeDefined();
    expect(result.monthlyStats).toHaveLength(12); // Last 12 months
    expect(result.durationTrends).toBeDefined();
    expect(result.durationTrends).toHaveLength(12);
    expect(result.testTrend).toBeDefined();
    expect(Array.isArray(result.testTrend)).toBe(true);
  });

  it('should calculate monthly build stats correctly', async () => {
    const today = new Date();
    const runs = [
      { ...mockWorkflowRunRecord, id: '1', githubRunId: 1, status: 'success' as const, workflowCreatedAt: today },
      { ...mockWorkflowRunRecord, id: '2', githubRunId: 2, status: 'failure' as const, workflowCreatedAt: today },
      { ...mockWorkflowRunRecord, id: '3', githubRunId: 3, status: 'success' as const, workflowCreatedAt: today },
    ];
    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue([]);
    mockWorkflowRunRepo.findByBuildIdInDateRange.mockResolvedValue(runs);

    const useCase = new FetchBuildDetailsStatsUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockBuildRepo
    );
    const result = await useCase.execute(mockBuild);

    expect(result.monthlyStats).toHaveLength(12);
    
    // Find current month stats
    const currentMonth = result.monthlyStats.find(m => {
      const [year, month] = m.month.split('-').map(Number);
      return year === today.getFullYear() && month === today.getMonth() + 1;
    });
    
    expect(currentMonth).toBeDefined();
    expect(currentMonth?.successCount).toBe(2);
    expect(currentMonth?.failureCount).toBe(1);
    expect(currentMonth?.totalCount).toBe(3);
  });

  it('should calculate duration trends correctly', async () => {
    const today = new Date();
    const runs = [
      { ...mockWorkflowRunRecord, id: '1', duration: 1000, workflowCreatedAt: today },
      { ...mockWorkflowRunRecord, id: '2', duration: 2000, workflowCreatedAt: today },
      { ...mockWorkflowRunRecord, id: '3', duration: 3000, workflowCreatedAt: today },
    ];
    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue([]);
    mockWorkflowRunRepo.findByBuildIdInDateRange.mockResolvedValue(runs);

    const useCase = new FetchBuildDetailsStatsUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockBuildRepo
    );
    const result = await useCase.execute(mockBuild);

    expect(result.durationTrends).toHaveLength(12);
    
    // Find current month duration trend
    const currentMonth = result.durationTrends.find(d => {
      const [year, month] = d.period.split('-').map(Number);
      return year === today.getFullYear() && month === today.getMonth() + 1;
    });
    
    expect(currentMonth).toBeDefined();
    expect(currentMonth?.avgDuration).toBe(2000); // (1000 + 2000 + 3000) / 3
    expect(currentMonth?.minDuration).toBe(1000);
    expect(currentMonth?.maxDuration).toBe(3000);
    expect(currentMonth?.count).toBe(3);
  });

  it('should skip runs without duration in duration trends', async () => {
    const today = new Date();
    const runs = [
      { ...mockWorkflowRunRecord, id: '1', duration: 1000, workflowCreatedAt: today },
      { ...mockWorkflowRunRecord, id: '2', duration: null, workflowCreatedAt: today },
      { ...mockWorkflowRunRecord, id: '3', duration: 0, workflowCreatedAt: today },
    ];
    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue([]);
    mockWorkflowRunRepo.findByBuildIdInDateRange.mockResolvedValue(runs);

    const useCase = new FetchBuildDetailsStatsUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockBuildRepo
    );
    const result = await useCase.execute(mockBuild);

    const currentMonth = result.durationTrends.find(d => {
      const [year, month] = d.period.split('-').map(Number);
      return year === today.getFullYear() && month === today.getMonth() + 1;
    });
    
    expect(currentMonth?.count).toBe(1); // Only run with duration > 0
  });

  it('should fetch and cache GitHub metadata when client is provided', async () => {
    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue([mockWorkflowRunRecord]);
    mockWorkflowRunRepo.findByBuildIdInDateRange.mockResolvedValue([]);
    
    mockGithubClient.fetchLastCommit.mockResolvedValue({
      sha: 'abc123',
      message: 'Test commit',
      author: 'Test Author',
      date: new Date('2024-01-01T10:00:00Z'),
      url: 'https://github.com/test-org/test-repo/commit/abc123',
    });
    mockGithubClient.fetchContributorsList.mockResolvedValue([
      { login: 'user1', name: 'User One', avatarUrl: 'https://avatar.url/user1', contributions: 100, profileUrl: 'https://github.com/user1' },
      { login: 'user2', name: 'User Two', avatarUrl: 'https://avatar.url/user2', contributions: 50, profileUrl: 'https://github.com/user2' },
    ]);
    mockGithubClient.fetchMostActiveFiles.mockResolvedValue([
      { path: 'src/main.ts', updateCount: 10, lastUpdated: new Date() },
    ]);
    mockGithubClient.fetchCommitsWithDates.mockResolvedValue([
      { sha: 'abc', date: new Date() },
    ]);

    const useCase = new FetchBuildDetailsStatsUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockBuildRepo,
      mockGithubClient
    );
    const result = await useCase.execute(mockBuild);

    expect(result.contributors).toHaveLength(2);
    expect(result.mostUpdatedFiles).toHaveLength(1);
    expect(result.monthlyCommits).toBeDefined();
    expect(mockBuildRepo.update).toHaveBeenCalledWith(
      mockBuild.id,
      expect.objectContaining({
        mostUpdatedFiles: expect.any(Array),
        monthlyCommits: expect.any(Array),
        contributors: expect.any(Array),
        lastAnalyzedCommitSha: 'abc123',
      }),
      tenantId
    );
  });

  it('should use cached GitHub metadata when commit SHA matches', async () => {
    const buildWithCache: Build = {
      ...mockBuild,
      lastAnalyzedCommitSha: 'abc123',
      mostUpdatedFiles: [{ path: 'src/main.ts', updateCount: 10, lastUpdated: new Date() }],
      monthlyCommits: [{ month: '2024-01', commitCount: 5 }],
      contributors: [{ login: 'user1', name: 'User One', avatarUrl: 'https://avatar.url/user1', contributions: 100, profileUrl: 'https://github.com/user1' }],
      // Also need base stats cache fields to avoid base stats cache update
      tags: ['v1.0.0'],
      totalCommits: 100,
      totalContributors: 10,
      cachedCommitsLast7Days: 5,
      cachedContributorsLast7Days: 3,
    };

    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue([mockWorkflowRunRecord]);
    mockWorkflowRunRepo.findByBuildIdInDateRange.mockResolvedValue([]);
    
    mockGithubClient.fetchLastCommit.mockResolvedValue({
      sha: 'abc123', // Same as cached
      message: 'Test commit',
      author: 'Test Author',
      date: new Date('2024-01-01T10:00:00Z'),
      url: 'https://github.com/test-org/test-repo/commit/abc123',
    });

    const useCase = new FetchBuildDetailsStatsUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockBuildRepo,
      mockGithubClient
    );
    const result = await useCase.execute(buildWithCache);

    // Should use cached values
    expect(result.contributors).toEqual(buildWithCache.contributors!);
    expect(result.mostUpdatedFiles).toEqual(buildWithCache.mostUpdatedFiles!);
    expect(result.monthlyCommits).toEqual(buildWithCache.monthlyCommits!);

    // Should NOT call GitHub API for these methods
    expect(mockGithubClient.fetchContributorsList).not.toHaveBeenCalled();
    expect(mockGithubClient.fetchMostActiveFiles).not.toHaveBeenCalled();
    expect(mockGithubClient.fetchCommitsWithDates).not.toHaveBeenCalled();

    // Should NOT update cache (neither base stats nor detailed stats)
    expect(mockBuildRepo.update).not.toHaveBeenCalled();
  });

  it('should refresh GitHub metadata when commit SHA changes', async () => {
    const buildWithOldCache: Build = {
      ...mockBuild,
      lastAnalyzedCommitSha: 'old123',
      mostUpdatedFiles: [{ path: 'old/file.ts', updateCount: 1, lastUpdated: new Date() }],
      monthlyCommits: [{ month: '2024-01', commitCount: 1 }],
      contributors: [{ login: 'olduser', name: 'Old User', avatarUrl: 'https://avatar.url/olduser', contributions: 10, profileUrl: 'https://github.com/olduser' }],
    };

    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue([mockWorkflowRunRecord]);
    mockWorkflowRunRepo.findByBuildIdInDateRange.mockResolvedValue([]);
    
    mockGithubClient.fetchLastCommit.mockResolvedValue({
      sha: 'new456', // Different from cached
      message: 'New commit',
      author: 'Test Author',
      date: new Date('2024-01-02T10:00:00Z'),
      url: 'https://github.com/test-org/test-repo/commit/new456',
    });
    mockGithubClient.fetchContributorsList.mockResolvedValue([
      { login: 'newuser', name: 'New User', avatarUrl: 'https://avatar.url/newuser', contributions: 200, profileUrl: 'https://github.com/newuser' },
    ]);
    mockGithubClient.fetchMostActiveFiles.mockResolvedValue([
      { path: 'new/file.ts', updateCount: 20, lastUpdated: new Date() },
    ]);
    mockGithubClient.fetchCommitsWithDates.mockResolvedValue([
      { sha: 'new456', date: new Date() },
    ]);

    const useCase = new FetchBuildDetailsStatsUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockBuildRepo,
      mockGithubClient
    );
    const result = await useCase.execute(buildWithOldCache);

    // Should fetch fresh values
    expect(result.contributors[0]?.login).toBe('newuser');
    expect(result.mostUpdatedFiles[0]?.path).toBe('new/file.ts');

    // Should call all GitHub API methods
    expect(mockGithubClient.fetchContributorsList).toHaveBeenCalled();
    expect(mockGithubClient.fetchMostActiveFiles).toHaveBeenCalled();
    expect(mockGithubClient.fetchCommitsWithDates).toHaveBeenCalled();

    // Should update cache
    expect(mockBuildRepo.update).toHaveBeenCalledWith(
      mockBuild.id,
      expect.objectContaining({
        lastAnalyzedCommitSha: 'new456',
      }),
      tenantId
    );
  });

  it('should calculate test trend from test results', async () => {
    // Runs come from database in DESC order (newest first)
    const runs = [
      { ...mockWorkflowRunRecord, id: '2', githubRunId: 2, workflowCreatedAt: new Date('2024-01-02') },
      { ...mockWorkflowRunRecord, id: '1', githubRunId: 1, workflowCreatedAt: new Date('2024-01-01') },
    ];
    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue([]);
    mockWorkflowRunRepo.findByBuildIdInDateRange.mockResolvedValue(runs);
    
    mockTestResultRepo.findByWorkflowRunId.mockImplementation((runId: string) => {
      if (runId === '1') {
        return Promise.resolve({ ...mockTestResultRecord, id: 'test-1', workflowRunId: '1', totalTests: 10, passedTests: 8 });
      }
      if (runId === '2') {
        return Promise.resolve({ ...mockTestResultRecord, id: 'test-2', workflowRunId: '2', totalTests: 12, passedTests: 10 });
      }
      return Promise.resolve(null);
    });

    const useCase = new FetchBuildDetailsStatsUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockBuildRepo
    );
    const result = await useCase.execute(mockBuild);

    expect(result.testTrend).toHaveLength(2);
    // After reverse, results should be in chronological order (oldest first)
    expect(result.testTrend[0]?.totalTests).toBe(10); // 2024-01-01
    expect(result.testTrend[1]?.totalTests).toBe(12); // 2024-01-02
  });

  it('should handle missing GitHub client gracefully', async () => {
    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue([mockWorkflowRunRecord]);
    mockWorkflowRunRepo.findByBuildIdInDateRange.mockResolvedValue([]);

    const useCase = new FetchBuildDetailsStatsUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockBuildRepo
      // No GitHub client provided
    );
    const result = await useCase.execute(mockBuild);

    // Should return empty GitHub data
    expect(result.monthlyCommits).toHaveLength(12);
    expect(result.monthlyCommits.every(m => m.commitCount === 0)).toBe(true);
    expect(result.contributors).toHaveLength(0);
    expect(result.mostUpdatedFiles).toHaveLength(0);
  });

  it('should handle GitHub API errors gracefully', async () => {
    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue([mockWorkflowRunRecord]);
    mockWorkflowRunRepo.findByBuildIdInDateRange.mockResolvedValue([]);
    
    mockGithubClient.fetchLastCommit.mockResolvedValue({
      sha: 'abc123',
      message: 'Test commit',
      author: 'Test Author',
      date: new Date('2024-01-01T10:00:00Z'),
      url: 'https://github.com/test-org/test-repo/commit/abc123',
    });
    mockGithubClient.fetchContributorsList.mockRejectedValue(new Error('GitHub API error'));
    mockGithubClient.fetchMostActiveFiles.mockRejectedValue(new Error('GitHub API error'));
    mockGithubClient.fetchCommitsWithDates.mockRejectedValue(new Error('GitHub API error'));

    const useCase = new FetchBuildDetailsStatsUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockBuildRepo,
      mockGithubClient
    );
    const result = await useCase.execute(mockBuild);

    // Should return empty data on error (graceful degradation)
    expect(result.contributors).toHaveLength(0);
    expect(result.mostUpdatedFiles).toHaveLength(0);
    expect(result.monthlyCommits.every(m => m.commitCount === 0)).toBe(true);
  });

  it('should return empty monthly commits when no commits found', async () => {
    mockWorkflowRunRepo.findByBuildIdSince.mockResolvedValue([mockWorkflowRunRecord]);
    mockWorkflowRunRepo.findByBuildIdInDateRange.mockResolvedValue([]);
    
    mockGithubClient.fetchLastCommit.mockResolvedValue({
      sha: 'abc123',
      message: 'Test commit',
      author: 'Test Author',
      date: new Date('2024-01-01T10:00:00Z'),
      url: 'https://github.com/test-org/test-repo/commit/abc123',
    });
    mockGithubClient.fetchContributorsList.mockResolvedValue([]);
    mockGithubClient.fetchMostActiveFiles.mockResolvedValue([]);
    mockGithubClient.fetchCommitsWithDates.mockResolvedValue([]); // No commits

    const useCase = new FetchBuildDetailsStatsUseCase(
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockBuildRepo,
      mockGithubClient
    );
    const result = await useCase.execute(mockBuild);

    expect(result.monthlyCommits).toHaveLength(12);
    expect(result.monthlyCommits.every(m => m.commitCount === 0)).toBe(true);
  });
});
