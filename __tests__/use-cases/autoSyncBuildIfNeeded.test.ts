import { describe, test, expect, mock, beforeEach } from 'bun:test';
import { AutoSyncBuildIfNeededUseCase } from '../../src/use-cases/autoSyncBuildIfNeeded';
import type { Build } from '../../src/domain/models';

describe('AutoSyncBuildIfNeededUseCase', () => {
  const mockBuild: Build = {
    id: 'build-123',
    tenantId: 'tenant-123',
    name: 'Test Build',
    organization: 'test-org',
    repository: 'test-repo',
    selectors: [{ type: 'branch', pattern: 'main' }],
    personalAccessToken: 'test-token',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    accessTokenId: 'ignore',
    lastAnalyzedCommitSha: 'abc123def',
  };

  let mockGithubClient: any;
  let mockBuildRepo: any;
  let mockWorkflowRunRepo: any;
  let mockTestResultRepo: any;
  let mockSyncStatusRepo: any;
  let useCase: AutoSyncBuildIfNeededUseCase;

  beforeEach(() => {
    mockGithubClient = {
      fetchLastCommit: mock(() => Promise.resolve(null)),
    };

    mockBuildRepo = {
      findById: mock(() => Promise.resolve(mockBuild)),
      update: mock(() => Promise.resolve()),
    };

    mockWorkflowRunRepo = {
      findByBuildId: mock(() => Promise.resolve([])),
      save: mock(() => Promise.resolve()),
    };

    mockTestResultRepo = {
      findByWorkflowRunId: mock(() => Promise.resolve([])),
      save: mock(() => Promise.resolve()),
    };

    mockSyncStatusRepo = {
      findByBuildId: mock(() => Promise.resolve({
        buildId: mockBuild.id,
        tenantId: mockBuild.tenantId,
        lastSyncedAt: new Date('2025-01-01T00:00:00Z'),
        initialBackfillCompleted: true,
        lastSyncError: null,
      })),
      save: mock(() => Promise.resolve()),
      upsert: mock(() => Promise.resolve()),
    };

    useCase = new AutoSyncBuildIfNeededUseCase(
      mockGithubClient,
      mockBuildRepo,
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockSyncStatusRepo
    );
  });

  test('should return false when no commits are found', async () => {
    mockGithubClient.fetchLastCommit.mockResolvedValue(null);

    const result = await useCase.execute(mockBuild);

    expect(result).toBe(false);
    expect(mockGithubClient.fetchLastCommit).toHaveBeenCalledWith('test-org', 'test-repo');
  });

  test('should return false when commit has not changed', async () => {
    mockGithubClient.fetchLastCommit.mockResolvedValue({
      sha: 'abc123def', // Same as lastAnalyzedCommitSha
      message: 'Test commit',
      author: 'Test Author',
      date: new Date('2025-01-01T00:00:00Z'),
      url: 'https://github.com/test-org/test-repo/commit/abc123def',
    });

    const result = await useCase.execute(mockBuild);

    expect(result).toBe(false);
    expect(mockGithubClient.fetchLastCommit).toHaveBeenCalledWith('test-org', 'test-repo');
  });

  test('should return true and sync when new commit is detected', async () => {
    const newCommit = {
      sha: 'new456xyz', // Different from lastAnalyzedCommitSha
      message: 'New commit',
      author: 'Test Author',
      date: new Date('2025-01-02T00:00:00Z'),
      url: 'https://github.com/test-org/test-repo/commit/new456xyz',
    };

    mockGithubClient.fetchLastCommit.mockResolvedValue(newCommit);
    // Mock all required GitHub client methods for sync
    mockGithubClient.fetchWorkflowRuns = mock(() => Promise.resolve([]));
    mockGithubClient.fetchTags = mock(() => Promise.resolve([]));
    mockGithubClient.fetchLastTag = mock(() => Promise.resolve(null));
    mockGithubClient.fetchWorkflows = mock(() => Promise.resolve([]));
    mockGithubClient.fetchTestResults = mock(() => Promise.resolve(null));

    const result = await useCase.execute(mockBuild);

    expect(result).toBe(true);
    expect(mockGithubClient.fetchLastCommit).toHaveBeenCalledWith('test-org', 'test-repo');
  });

  test('should return false and not throw when sync fails', async () => {
    const newCommit = {
      sha: 'new456xyz',
      message: 'New commit',
      author: 'Test Author',
      date: new Date('2025-01-02T00:00:00Z'),
      url: 'https://github.com/test-org/test-repo/commit/new456xyz',
    };

    mockGithubClient.fetchLastCommit.mockResolvedValue(newCommit);
    mockGithubClient.fetchWorkflowRuns = mock(() => Promise.reject(new Error('GitHub API error')));

    // Should not throw, just return false
    const result = await useCase.execute(mockBuild);

    expect(result).toBe(false);
  });

  test('should return false when build has no cached commit SHA', async () => {
    const buildWithoutSha = { ...mockBuild, lastAnalyzedCommitSha: null };

    mockGithubClient.fetchLastCommit.mockResolvedValue({
      sha: 'abc123def',
      message: 'Test commit',
      author: 'Test Author',
      date: new Date('2025-01-01T00:00:00Z'),
      url: 'https://github.com/test-org/test-repo/commit/abc123def',
    });

    mockGithubClient.fetchWorkflowRuns = mock(() => Promise.resolve([]));
    mockGithubClient.fetchLastTag = mock(() => Promise.resolve(null));
    mockGithubClient.fetchTags = mock(() => Promise.resolve([]));
    mockGithubClient.fetchWorkflows = mock(() => Promise.resolve([]));
    mockGithubClient.fetchTestResults = mock(() => Promise.resolve({ passed: 0, failed: 0, skipped: 0, total: 0 }));

    const result = await useCase.execute(buildWithoutSha);

    // Should sync because there's no cached SHA (first time)
    expect(result).toBe(true);
  });
});
