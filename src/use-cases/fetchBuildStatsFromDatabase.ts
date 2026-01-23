import type { Build, BuildStats, DailySuccess, WorkflowRun, TestStats, WorkflowRunRecord } from '@/domain/models';
import type { CachedGitHubClient } from '@/infrastructure/CachedGitHubClient';
import type { WorkflowRunRepository } from '@/infrastructure/DatabaseWorkflowRunRepository';
import type { TestResultRepository } from '@/infrastructure/DatabaseTestResultRepository';
import { calculateHealthPercentage, formatDateYYYYMMDD, getLastNDaysRange } from '@/domain/utils';

/**
 * Fetches build statistics from the database (for fast loading)
 * with optional GitHub refresh capability
 */
export class FetchBuildStatsFromDatabaseUseCase {
  constructor(
    private workflowRunRepo: WorkflowRunRepository,
    private testResultRepo: TestResultRepository,
    private githubClient?: CachedGitHubClient
  ) {}

  async execute(build: Build): Promise<BuildStats> {
    try {
      // Fetch workflow runs from database (last 7 days for stats)
      const sevenDaysAgo = this.getSevenDaysAgo();
      const allRuns = await this.fetchWorkflowRunsFromDatabase(build, sevenDaysAgo);

      // Convert database records to WorkflowRun format
      const workflowRuns = allRuns.map(this.mapRecordToWorkflowRun);

      // Get last 7 days range for the bar chart
      const last7Days = getLastNDaysRange(7);

      // Calculate statistics from database records
      const totalExecutions = workflowRuns.length;
      const successfulExecutions = workflowRuns.filter((run) => run.status === 'success').length;
      const failedExecutions = workflowRuns.filter((run) => run.status === 'failure').length;
      const healthPercentage = calculateHealthPercentage(successfulExecutions, totalExecutions);

      // Build daily success and failure counts for stacked bar chart
      const last7DaysSuccesses: DailySuccess[] = last7Days.map((date) => {
        const dateStr = formatDateYYYYMMDD(date);
        const successCount = workflowRuns.filter(
          (run) => run.status === 'success' && formatDateYYYYMMDD(run.createdAt) === dateStr
        ).length;
        const failureCount = workflowRuns.filter(
          (run) => run.status === 'failure' && formatDateYYYYMMDD(run.createdAt) === dateStr
        ).length;

        return {
          date: dateStr,
          successCount,
          failureCount,
        };
      });

      // Get last 3 runs for links
      const recentRuns = workflowRuns.slice(0, 3);

      // Fetch test stats from database (latest test result)
      let testStats: TestStats | null = null;
      const latestTestResults = await this.testResultRepo.findByBuildId(build.id, build.tenantId, 1);
      if (latestTestResults.length > 0 && latestTestResults[0]) {
        const testResult = latestTestResults[0];
        testStats = {
          totalTests: testResult.totalTests,
          passedTests: testResult.passedTests,
          failedTests: testResult.failedTests,
          skippedTests: testResult.skippedTests,
        };
      }

      // For metadata fields (tags, commits, contributors), use GitHub client if available
      // Otherwise, return placeholder values
      let lastTag: string | null = null;
      let commitsLast7Days = 0;
      let contributorsLast7Days = 0;
      let lastCommit = null;
      let totalCommits = 0;
      let totalContributors = 0;

      if (this.githubClient) {
        try {
          // Fetch metadata from GitHub (these are still needed as they're not in workflow runs)
          lastTag = await this.githubClient.fetchLatestTag(
            build.organization,
            build.repository,
            build.cacheExpirationMinutes
          );

          const today = new Date();
          commitsLast7Days = await this.githubClient.fetchCommits(
            build.organization,
            build.repository,
            build.cacheExpirationMinutes,
            sevenDaysAgo,
            today
          );

          contributorsLast7Days = await this.githubClient.fetchContributors(
            build.organization,
            build.repository,
            build.cacheExpirationMinutes,
            sevenDaysAgo
          );

          const lastCommitData = await this.githubClient.fetchLastCommit(
            build.organization,
            build.repository,
            build.cacheExpirationMinutes
          );

          if (lastCommitData) {
            lastCommit = {
              message: lastCommitData.message,
              date: lastCommitData.date,
              author: lastCommitData.author,
              sha: lastCommitData.sha,
              url: lastCommitData.url,
            };
          }

          totalCommits = await this.githubClient.fetchCommits(
            build.organization,
            build.repository,
            build.cacheExpirationMinutes
          );

          totalContributors = await this.githubClient.fetchTotalContributors(
            build.organization,
            build.repository,
            build.cacheExpirationMinutes
          );
        } catch (error) {
          console.warn('Failed to fetch metadata from GitHub:', error);
          // Continue with database data only
        }
      }

      return {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        healthPercentage,
        lastTag,
        last7DaysSuccesses,
        recentRuns,
        lastFetchedAt: new Date(),
        commitsLast7Days,
        contributorsLast7Days,
        lastCommit,
        totalCommits,
        totalContributors,
        testStats,
      };
    } catch (error) {
      throw error;
    }
  }

  private async fetchWorkflowRunsFromDatabase(
    build: Build,
    since: Date
  ): Promise<WorkflowRunRecord[]> {
    // Fetch all workflow runs for this build since the specified date
    const allRuns = await this.workflowRunRepo.findByBuildIdSince(build.id, build.tenantId, since);
    return allRuns;
  }

  private mapRecordToWorkflowRun(record: WorkflowRunRecord): WorkflowRun {
    return {
      id: record.githubRunId,
      name: record.name,
      status: record.status,
      conclusion: record.conclusion,
      htmlUrl: record.htmlUrl,
      createdAt: record.workflowCreatedAt,
      updatedAt: record.workflowUpdatedAt,
      duration: record.duration || undefined,
      headBranch: record.headBranch || undefined,
      event: record.event || undefined,
    };
  }

  private getSevenDaysAgo(): Date {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    return sevenDaysAgo;
  }
}
