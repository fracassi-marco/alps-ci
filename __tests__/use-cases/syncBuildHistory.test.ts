import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { SyncBuildHistoryUseCase } from '@/use-cases/syncBuildHistory';
import type { Build, WorkflowRun, WorkflowRunRecord } from '@/domain/models';
import type { GitHubClient } from '@/infrastructure/GitHubClient';

describe('SyncBuildHistoryUseCase', () => {
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

  const mockSyncStatus = {
    id: 'sync-123',
    buildId: 'build-123',
    tenantId,
    initialBackfillCompleted: false,
    totalRunsSynced: 0,
    lastSyncedAt: null,
    lastSyncedRunId: null,
    lastSyncedRunCreatedAt: null,
    lastSyncError: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  let mockGithubClient: any;
  let mockWorkflowRunRepo: any;
  let mockTestResultRepo: any;
  let mockSyncStatusRepo: any;

  beforeEach(() => {
    mockGithubClient = {
      fetchWorkflowRuns: mock(() => Promise.resolve([])),
      fetchTags: mock(() => Promise.resolve([])),
      fetchArtifacts: mock(() => Promise.resolve([])),
      downloadArtifact: mock(() => Promise.resolve(null)),
    };

    mockWorkflowRunRepo = {
      findByGithubRunId: mock(() => Promise.resolve(null)),
      bulkCreate: mock((records) => Promise.resolve(records)),
      bulkUpsert: mock((records) => Promise.resolve(records)),
    };

    mockTestResultRepo = {
      findByWorkflowRunId: mock(() => Promise.resolve(null)),
      create: mock((data) => Promise.resolve({ id: 'test-123', ...data })),
    };

    mockSyncStatusRepo = {
      findByBuildId: mock(() => Promise.resolve(null)),
      upsert: mock((data) => Promise.resolve({ id: 'sync-123', ...data })),
      markBackfillComplete: mock(() => Promise.resolve()),
    };
  });

  it('should create sync status if not exists', async () => {
    mockSyncStatusRepo.findByBuildId.mockResolvedValue(null);
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue([]);

    const useCase = new SyncBuildHistoryUseCase(
      mockGithubClient,
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockSyncStatusRepo
    );
    await useCase.execute(mockBuild);

    expect(mockSyncStatusRepo.upsert).toHaveBeenCalledWith({
      buildId: mockBuild.id,
      tenantId: mockBuild.tenantId,
      initialBackfillCompleted: false,
      totalRunsSynced: 0,
    });
  });

  it('should sync new workflow runs from GitHub', async () => {
    mockSyncStatusRepo.findByBuildId.mockResolvedValue(mockSyncStatus);
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue([mockWorkflowRun]);
    mockWorkflowRunRepo.findByGithubRunId.mockResolvedValue(null); // Run doesn't exist

    const useCase = new SyncBuildHistoryUseCase(
      mockGithubClient,
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockSyncStatusRepo
    );
    const result = await useCase.execute(mockBuild);

    expect(result.newRunsSynced).toBe(1);
    expect(mockWorkflowRunRepo.bulkUpsert).toHaveBeenCalledWith([
      expect.objectContaining({
        buildId: mockBuild.id,
        tenantId: mockBuild.tenantId,
        githubRunId: mockWorkflowRun.id,
        name: mockWorkflowRun.name,
        status: mockWorkflowRun.status,
      }),
    ]);
  });

  it('should update existing workflow runs', async () => {
    mockSyncStatusRepo.findByBuildId.mockResolvedValue(mockSyncStatus);
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue([mockWorkflowRun]);
    mockWorkflowRunRepo.findByGithubRunId.mockResolvedValue({ id: 'existing-run' }); // Run exists

    const useCase = new SyncBuildHistoryUseCase(
      mockGithubClient,
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockSyncStatusRepo
    );
    const result = await useCase.execute(mockBuild);

    expect(result.newRunsSynced).toBe(1);
    expect(mockWorkflowRunRepo.bulkUpsert).toHaveBeenCalled();
  });

  it('should filter runs by branch selector', async () => {
    mockSyncStatusRepo.findByBuildId.mockResolvedValue(mockSyncStatus);
    const runs = [
      { ...mockWorkflowRun, id: 1, headBranch: 'main' },
      { ...mockWorkflowRun, id: 2, headBranch: 'develop' },
    ];
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue(runs);
    mockWorkflowRunRepo.findByGithubRunId.mockResolvedValue(null);

    const buildWithBranchSelector: Build = {
      ...mockBuild,
      selectors: [{ type: 'branch', pattern: 'main' }],
    };

    const useCase = new SyncBuildHistoryUseCase(
      mockGithubClient,
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockSyncStatusRepo
    );
    const result = await useCase.execute(buildWithBranchSelector);

    expect(result.newRunsSynced).toBe(1); // Only main branch
  });

  it('should filter runs by workflow name selector', async () => {
    mockSyncStatusRepo.findByBuildId.mockResolvedValue(mockSyncStatus);
    const runs = [
      { ...mockWorkflowRun, id: 1, name: 'CI' },
      { ...mockWorkflowRun, id: 2, name: 'Deploy' },
    ];
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue(runs);
    mockWorkflowRunRepo.findByGithubRunId.mockResolvedValue(null);

    const buildWithWorkflowSelector: Build = {
      ...mockBuild,
      selectors: [{ type: 'workflow', pattern: 'CI' }],
    };

    const useCase = new SyncBuildHistoryUseCase(
      mockGithubClient,
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockSyncStatusRepo
    );
    const result = await useCase.execute(buildWithWorkflowSelector);

    expect(result.newRunsSynced).toBe(1); // Only CI workflow
  });

  it('should filter runs by tag selector', async () => {
    mockSyncStatusRepo.findByBuildId.mockResolvedValue(mockSyncStatus);
    const runs = [
      { ...mockWorkflowRun, id: 1, headBranch: 'v1.0.0' },
      { ...mockWorkflowRun, id: 2, headBranch: 'main' },
    ];
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue(runs);
    mockGithubClient.fetchTags.mockResolvedValue(['v1.0.0', 'v2.0.0']);
    mockWorkflowRunRepo.findByGithubRunId.mockResolvedValue(null);

    const buildWithTagSelector: Build = {
      ...mockBuild,
      selectors: [{ type: 'tag', pattern: 'v*' }],
    };

    const useCase = new SyncBuildHistoryUseCase(
      mockGithubClient,
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockSyncStatusRepo
    );
    const result = await useCase.execute(buildWithTagSelector);

    expect(result.newRunsSynced).toBe(1); // Only tag runs
  });

  it('should fetch and persist test results for completed runs', async () => {
    mockSyncStatusRepo.findByBuildId.mockResolvedValue(mockSyncStatus);
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue([mockWorkflowRun]);
    mockWorkflowRunRepo.findByGithubRunId.mockResolvedValue(null);
    
    const persistedRun: WorkflowRunRecord = {
      id: 'run-123',
      buildId: mockBuild.id,
      tenantId: mockBuild.tenantId,
      githubRunId: mockWorkflowRun.id,
      name: mockWorkflowRun.name,
      status: 'success',
      conclusion: 'success',
      htmlUrl: mockWorkflowRun.htmlUrl,
      headBranch: mockWorkflowRun.headBranch || null,
      event: mockWorkflowRun.event || null,
      duration: mockWorkflowRun.duration || null,
      commitSha: 'unknown',
      commitMessage: null,
      commitAuthor: null,
      commitDate: null,
      workflowCreatedAt: mockWorkflowRun.createdAt,
      workflowUpdatedAt: mockWorkflowRun.updatedAt,
      syncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    mockWorkflowRunRepo.bulkUpsert.mockResolvedValue([persistedRun]);
    mockGithubClient.fetchArtifacts.mockResolvedValue([
      { id: 1, name: 'test-results.xml', size_in_bytes: 1024 }
    ]);
    mockGithubClient.downloadArtifact.mockResolvedValue(`
      <?xml version="1.0" encoding="UTF-8"?>
      <testsuites tests="10" failures="2" skipped="1">
        <testsuite name="Suite 1" tests="10" failures="2" skipped="1">
        </testsuite>
      </testsuites>
    `);

    const useCase = new SyncBuildHistoryUseCase(
      mockGithubClient,
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockSyncStatusRepo
    );
    const result = await useCase.execute(mockBuild);

    expect(result.newRunsSynced).toBe(1);
    expect(result.testResultsParsed).toBe(1);
    expect(mockTestResultRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowRunId: persistedRun.id,
        buildId: mockBuild.id,
        tenantId: mockBuild.tenantId,
        totalTests: 10,
        failedTests: 2,
        skippedTests: 1,
        passedTests: 7,
      })
    );
  });

  it('should not fetch test results for in-progress runs', async () => {
    mockSyncStatusRepo.findByBuildId.mockResolvedValue(mockSyncStatus);
    const inProgressRun = { ...mockWorkflowRun, status: 'in_progress' as const };
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue([inProgressRun]);
    mockWorkflowRunRepo.findByGithubRunId.mockResolvedValue(null);

    const persistedRun: WorkflowRunRecord = {
      id: 'run-123',
      buildId: mockBuild.id,
      tenantId: mockBuild.tenantId,
      githubRunId: inProgressRun.id,
      name: inProgressRun.name,
      status: 'in_progress',
      conclusion: 'in_progress',
      htmlUrl: inProgressRun.htmlUrl,
      headBranch: inProgressRun.headBranch || null,
      event: inProgressRun.event || null,
      duration: inProgressRun.duration || null,
      commitSha: 'unknown',
      commitMessage: null,
      commitAuthor: null,
      commitDate: null,
      workflowCreatedAt: inProgressRun.createdAt,
      workflowUpdatedAt: inProgressRun.updatedAt,
      syncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    mockWorkflowRunRepo.bulkUpsert.mockResolvedValue([persistedRun]);

    const useCase = new SyncBuildHistoryUseCase(
      mockGithubClient,
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockSyncStatusRepo
    );
    const result = await useCase.execute(mockBuild);

    expect(result.testResultsParsed).toBe(0);
    expect(mockGithubClient.fetchArtifacts).not.toHaveBeenCalled();
  });

  it('should limit test result fetching to last 50 runs', async () => {
    mockSyncStatusRepo.findByBuildId.mockResolvedValue(mockSyncStatus);
    
    // Create 100 workflow runs
    const runs = Array.from({ length: 100 }, (_, i) => ({
      ...mockWorkflowRun,
      id: i + 1,
    }));
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue(runs);
    mockWorkflowRunRepo.findByGithubRunId.mockResolvedValue(null);

    const persistedRuns = runs.map((run, i) => ({
      id: `run-${i}`,
      buildId: mockBuild.id,
      tenantId: mockBuild.tenantId,
      githubRunId: run.id,
      name: run.name,
      status: 'success' as const,
      conclusion: 'success' as const,
      htmlUrl: run.htmlUrl,
      headBranch: run.headBranch || null,
      event: run.event || null,
      duration: run.duration || null,
      commitSha: 'unknown',
      commitMessage: null,
      commitAuthor: null,
      commitDate: null,
      workflowCreatedAt: run.createdAt,
      workflowUpdatedAt: run.updatedAt,
      syncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    
    mockWorkflowRunRepo.bulkUpsert.mockResolvedValue(persistedRuns);
    mockGithubClient.fetchArtifacts.mockResolvedValue([]); // No artifacts

    const useCase = new SyncBuildHistoryUseCase(
      mockGithubClient,
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockSyncStatusRepo
    );
    const result = await useCase.execute(mockBuild);

    expect(result.newRunsSynced).toBe(100);
    // fetchArtifacts should only be called 50 times (for last 50 runs)
    expect(mockGithubClient.fetchArtifacts).toHaveBeenCalledTimes(50);
  });

  it('should update sync status after successful sync', async () => {
    mockSyncStatusRepo.findByBuildId.mockResolvedValue(mockSyncStatus);
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue([mockWorkflowRun]);
    mockWorkflowRunRepo.findByGithubRunId.mockResolvedValue(null);

    const persistedRun: WorkflowRunRecord = {
      id: 'run-123',
      buildId: mockBuild.id,
      tenantId: mockBuild.tenantId,
      githubRunId: mockWorkflowRun.id,
      name: mockWorkflowRun.name,
      status: 'success',
      conclusion: 'success',
      htmlUrl: mockWorkflowRun.htmlUrl,
      headBranch: mockWorkflowRun.headBranch || null,
      event: mockWorkflowRun.event || null,
      duration: mockWorkflowRun.duration || null,
      commitSha: 'unknown',
      commitMessage: null,
      commitAuthor: null,
      commitDate: null,
      workflowCreatedAt: mockWorkflowRun.createdAt,
      workflowUpdatedAt: mockWorkflowRun.updatedAt,
      syncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    mockWorkflowRunRepo.bulkUpsert.mockResolvedValue([persistedRun]);

    const useCase = new SyncBuildHistoryUseCase(
      mockGithubClient,
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockSyncStatusRepo
    );
    await useCase.execute(mockBuild);

    expect(mockSyncStatusRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        buildId: mockBuild.id,
        tenantId: mockBuild.tenantId,
        lastSyncedRunId: mockWorkflowRun.id,
        lastSyncedRunCreatedAt: mockWorkflowRun.createdAt,
        totalRunsSynced: 1,
        lastSyncError: null,
      })
    );
  });

  it('should mark initial backfill as complete', async () => {
    mockSyncStatusRepo.findByBuildId.mockResolvedValue(mockSyncStatus);
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue([mockWorkflowRun]);
    mockWorkflowRunRepo.findByGithubRunId.mockResolvedValue(null);

    const useCase = new SyncBuildHistoryUseCase(
      mockGithubClient,
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockSyncStatusRepo
    );
    await useCase.execute(mockBuild);

    expect(mockSyncStatusRepo.markBackfillComplete).toHaveBeenCalledWith(
      mockBuild.id,
      mockBuild.tenantId
    );
  });

  it('should return zero synced when no new runs found', async () => {
    mockSyncStatusRepo.findByBuildId.mockResolvedValue(mockSyncStatus);
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue([]);

    const useCase = new SyncBuildHistoryUseCase(
      mockGithubClient,
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockSyncStatusRepo
    );
    const result = await useCase.execute(mockBuild);

    expect(result.newRunsSynced).toBe(0);
    expect(result.testResultsParsed).toBe(0);
  });

  it('should log error to sync status on failure', async () => {
    mockSyncStatusRepo.findByBuildId.mockResolvedValue(mockSyncStatus);
    mockGithubClient.fetchWorkflowRuns.mockRejectedValue(new Error('GitHub API error'));

    const useCase = new SyncBuildHistoryUseCase(
      mockGithubClient,
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockSyncStatusRepo
    );

    await expect(useCase.execute(mockBuild)).rejects.toThrow('GitHub API error');

    expect(mockSyncStatusRepo.upsert).toHaveBeenCalledWith({
      buildId: mockBuild.id,
      tenantId: mockBuild.tenantId,
      lastSyncError: 'GitHub API error',
    });
  });

  it('should continue syncing other runs if test result parsing fails', async () => {
    mockSyncStatusRepo.findByBuildId.mockResolvedValue(mockSyncStatus);
    const runs = [
      { ...mockWorkflowRun, id: 1 },
      { ...mockWorkflowRun, id: 2 },
    ];
    mockGithubClient.fetchWorkflowRuns.mockResolvedValue(runs);
    mockWorkflowRunRepo.findByGithubRunId.mockResolvedValue(null);

    const persistedRuns: WorkflowRunRecord[] = runs.map((run) => ({
      id: `run-${run.id}`,
      buildId: mockBuild.id,
      tenantId: mockBuild.tenantId,
      githubRunId: run.id,
      name: run.name,
      status: 'success',
      conclusion: 'success',
      htmlUrl: run.htmlUrl,
      headBranch: run.headBranch || null,
      event: run.event || null,
      duration: run.duration || null,
      commitSha: 'unknown',
      commitMessage: null,
      commitAuthor: null,
      commitDate: null,
      workflowCreatedAt: run.createdAt,
      workflowUpdatedAt: run.updatedAt,
      syncedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
    
    mockWorkflowRunRepo.bulkUpsert.mockResolvedValue(persistedRuns);
    mockGithubClient.fetchArtifacts.mockRejectedValue(new Error('Artifact fetch failed'));

    const useCase = new SyncBuildHistoryUseCase(
      mockGithubClient,
      mockWorkflowRunRepo,
      mockTestResultRepo,
      mockSyncStatusRepo
    );
    const result = await useCase.execute(mockBuild);

    // Should still sync runs even if test fetching fails
    expect(result.newRunsSynced).toBe(2);
    expect(result.testResultsParsed).toBe(0);
  });
});
