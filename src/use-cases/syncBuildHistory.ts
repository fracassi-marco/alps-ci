import type {Build, WorkflowRun, WorkflowRunRecord} from '@/domain/models';
import type {GitHubClient} from '@/infrastructure/GitHubClient';
import type {WorkflowRunRepository} from '@/infrastructure/DatabaseWorkflowRunRepository';
import type {TestResultRepository} from '@/infrastructure/DatabaseTestResultRepository';
import type {BuildSyncStatusRepository} from '@/infrastructure/DatabaseBuildSyncStatusRepository';
import {isTestArtifact, parseJUnitXML} from '@/infrastructure/junit-parser';
import {parseDetailedTestCases} from '@/infrastructure/test-case-parser';

export interface SyncResult {
  newRunsSynced: number;
  testResultsParsed: number;
  lastSyncedAt: Date;
}

export class SyncBuildHistoryUseCase {
  constructor(
    private githubClient: GitHubClient,
    private workflowRunRepo: WorkflowRunRepository,
    private testResultRepo: TestResultRepository,
    private syncStatusRepo: BuildSyncStatusRepository
  ) {}

  async execute(build: Build): Promise<SyncResult> {
    try {
      // 1. Get or create sync status for this build
      let syncStatus = await this.syncStatusRepo.findByBuildId(build.id, build.tenantId);

      if (!syncStatus) {
        syncStatus = await this.syncStatusRepo.upsert({
          buildId: build.id,
          tenantId: build.tenantId,
          initialBackfillCompleted: false,
          totalRunsSynced: 0,
        });
      }

      // 2. Determine date range for fetching
      const sinceDate = this.getBackfillStartDate(syncStatus);

      // 3. Fetch workflow runs from GitHub
      const githubRuns = await this.fetchWorkflowRunsForBuild(build, sinceDate, syncStatus);

      // 4. Filter out runs we already have in database
      const newRuns = await this.filterNewRuns(githubRuns, build.id, build.tenantId);

      if (newRuns.length === 0) {
        console.log(`No new workflow runs to sync for build ${build.name}`);
        return {
          newRunsSynced: 0,
          testResultsParsed: 0,
          lastSyncedAt: new Date(),
        };
      }

      // 5. Convert GitHub runs to database records
      const runRecords = newRuns.map((run) => this.mapGitHubRunToRecord(run, build));

      // 6. Persist workflow runs to database (bulk insert)
      const persistedRuns = await this.workflowRunRepo.bulkCreate(runRecords);

      console.log(`Synced ${persistedRuns.length} new workflow runs for build ${build.name}`);

      // 7. For completed runs, fetch and persist test results (LAST 50 ONLY)
      let testResultsParsed = 0;
      const runsForTestFetch = persistedRuns.slice(0, 50); // Only fetch tests for last 50 runs
      
      console.log(`Fetching test results for ${runsForTestFetch.length} of ${persistedRuns.length} runs`);
      
      for (const run of runsForTestFetch) {
        if (run.status === 'success' || run.status === 'failure') {
          try {
            const testResult = await this.fetchAndPersistTestResult(run, build);
            if (testResult) {
              testResultsParsed++;
            }
          } catch (err) {
            console.warn(`Failed to fetch test results for run ${run.githubRunId}:`, err);
            // Don't throw - continue syncing other runs
          }
        }
      }

      // 8. Update sync status with latest run info
      if (persistedRuns.length > 0) {
        // Runs are sorted newest first
        const latestRun = persistedRuns[0]!;
        await this.syncStatusRepo.upsert({
          buildId: build.id,
          tenantId: build.tenantId,
          lastSyncedAt: new Date(),
          lastSyncedRunId: latestRun.githubRunId,
          lastSyncedRunCreatedAt: latestRun.workflowCreatedAt,
          totalRunsSynced: (syncStatus.totalRunsSynced || 0) + persistedRuns.length,
          lastSyncError: null,
        });
      }

      // 9. Mark initial backfill as complete if not already
      if (!syncStatus.initialBackfillCompleted) {
        await this.syncStatusRepo.markBackfillComplete(build.id, build.tenantId);
      }

      return {
        newRunsSynced: persistedRuns.length,
        testResultsParsed,
        lastSyncedAt: new Date(),
      };
    } catch (error) {
      // Log error to sync status
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      await this.syncStatusRepo.upsert({
        buildId: build.id,
        tenantId: build.tenantId,
        lastSyncError: errorMessage,
      });

      throw error;
    }
  }

  private isInitialBackfill(syncStatus: { initialBackfillCompleted: boolean }): boolean {
    return !syncStatus.initialBackfillCompleted;
  }

  private getBackfillStartDate(syncStatus: { 
    initialBackfillCompleted: boolean; 
    lastSyncedRunCreatedAt: Date | null;
  }): Date {
    // If initial backfill not complete, fetch all history
    if (this.isInitialBackfill(syncStatus)) {
      // Use very old date to fetch all workflow runs (GitHub Actions launched in 2019)
      return new Date('2015-01-01');
    }
    // Otherwise, incremental sync from last run or last 30 days
    return syncStatus.lastSyncedRunCreatedAt || this.get30DaysAgo();
  }

  private async fetchWorkflowRunsForBuild(
    build: Build, 
    since: Date,
    syncStatus: { initialBackfillCompleted: boolean }
  ): Promise<WorkflowRun[]> {
    // Fetch all workflow runs since the specified date
    const allWorkflowRuns = await this.githubClient.fetchWorkflowRuns(
      build.organization,
      build.repository,
      { 
        since, 
        limit: this.isInitialBackfill(syncStatus) ? undefined : 100,
        delayMs: 100  // Add delay between paginated requests to avoid rate limits
      }
    );

    // Fetch all tags for tag matching
    const allTags = await this.githubClient.fetchTags(
      build.organization,
      build.repository,
      100
    );

    // Filter runs that match ANY selector (same logic as FetchBuildStatsUseCase)
    const filteredRuns = allWorkflowRuns.filter((run) => {
      return build.selectors.some((selector) => {
        switch (selector.type) {
          case 'branch':
            return run.headBranch && this.matchesPattern(run.headBranch, selector.pattern);

          case 'workflow':
            return run.name && this.matchesPattern(run.name, selector.pattern);

          case 'tag':
            if (!run.headBranch) return false;
            const matchingTags = allTags.filter((tag) => this.matchesPattern(tag, selector.pattern));
            return matchingTags.some(
              (tag) => run.headBranch === tag || run.headBranch === `refs/tags/${tag}`
            );

          default:
            return false;
        }
      });
    });

    // Sort by creation date (newest first)
    filteredRuns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return filteredRuns;
  }

  private async filterNewRuns(
    githubRuns: WorkflowRun[],
    buildId: string,
    tenantId: string
  ): Promise<WorkflowRun[]> {
    // Check which runs already exist in DB
    const newRuns: WorkflowRun[] = [];

    for (const run of githubRuns) {
      const existing = await this.workflowRunRepo.findByGithubRunId(buildId, run.id, tenantId);
      if (!existing) {
        newRuns.push(run);
      }
    }

    return newRuns;
  }

  private mapGitHubRunToRecord(
    run: WorkflowRun,
    build: Build
  ): Omit<WorkflowRunRecord, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      buildId: build.id,
      tenantId: build.tenantId,
      githubRunId: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      htmlUrl: run.htmlUrl,
      headBranch: run.headBranch || null,
      event: run.event || null,
      duration: run.duration || null,
      commitSha: 'unknown', // Will be enhanced later if needed
      commitMessage: null,
      commitAuthor: null,
      commitDate: null,
      workflowCreatedAt: run.createdAt,
      workflowUpdatedAt: run.updatedAt,
      syncedAt: new Date(),
    };
  }

  private async fetchAndPersistTestResult(
    run: WorkflowRunRecord,
    build: Build
  ): Promise<{ id: string } | null> {
    try {
      // Check if we already have test results for this run
      const existing = await this.testResultRepo.findByWorkflowRunId(run.id, run.tenantId);
      if (existing) {
        return existing;
      }

      // Fetch artifacts from GitHub
      const artifacts = await this.githubClient.fetchArtifacts(
        build.organization,
        build.repository,
        run.githubRunId
      );

      if (!artifacts || artifacts.length === 0) {
        return null;
      }

      // Find test artifacts
      const testArtifacts = artifacts.filter((artifact: { id: number; name: string; size_in_bytes: number }) =>
        isTestArtifact(artifact.name)
      );

      if (testArtifacts.length === 0) {
        return null;
      }

      // Try to download and parse each test artifact
      for (const artifact of testArtifacts) {
        try {
          const content = await this.githubClient.downloadArtifact(
            build.organization,
            build.repository,
            artifact.id
          );

          if (!content) {
            continue;
          }

          const testStats = parseJUnitXML(content);

          if (testStats) {
            // Parse detailed test cases from XML
            const testCases = parseDetailedTestCases(content);

            return await this.testResultRepo.create({
              workflowRunId: run.id,
              buildId: build.id,
              tenantId: build.tenantId,
              totalTests: testStats.totalTests,
              passedTests: testStats.passedTests,
              failedTests: testStats.failedTests,
              skippedTests: testStats.skippedTests,
              testCases: testCases.length > 0 ? testCases : null,
              artifactName: artifact.name,
              artifactUrl: `https://github.com/${build.organization}/${build.repository}/actions/runs/${run.githubRunId}/artifacts/${artifact.id}`,
              parsedAt: new Date(),
            });
          }
        } catch (error) {
          console.error(`Failed to download/parse artifact ${artifact.name}:`, error);
        }
      }

      return null;
    } catch (error) {
      console.error(`Failed to fetch test results for run ${run.githubRunId}:`, error);
      return null;
    }
  }

  private matchesPattern(value: string, pattern: string): boolean {
    // Convert wildcard pattern to regex (same as FetchBuildStatsUseCase)
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

    const regex = new RegExp(`^${regexPattern}$`, 'i');
    return regex.test(value);
  }

  private get30DaysAgo(): Date {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    date.setHours(0, 0, 0, 0);
    return date;
  }
}
