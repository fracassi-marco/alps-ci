import type { Build, BuildDetailsStats, MonthlyBuildStats, MonthlyCommitStats, TestTrendDataPoint, Contributor, WorkflowRunRecord, DurationTrend } from '@/domain/models';
import type { WorkflowRunRepository } from '@/infrastructure/DatabaseWorkflowRunRepository';
import type { TestResultRepository } from '@/infrastructure/DatabaseTestResultRepository';
import type { GitHubClient } from '@/infrastructure/GitHubClient';
import { formatDateYYYYMM, getLastNMonthsRange } from '@/domain/utils';
import { FetchBuildStatsFromDatabaseUseCase } from './fetchBuildStatsFromDatabase';

/**
 * Fetches extended build statistics including monthly aggregations
 * for the build details page
 */
import type { BuildRepository } from '@/infrastructure/DatabaseBuildRepository';

/**
 * Fetches extended build statistics including monthly aggregations
 * for the build details page
 */
export class FetchBuildDetailsStatsUseCase {
  constructor(
    private workflowRunRepo: WorkflowRunRepository,
    private testResultRepo: TestResultRepository,
    private buildRepo: BuildRepository,
    private githubClient?: GitHubClient
  ) { }

  async execute(build: Build): Promise<BuildDetailsStats> {
    // Get base stats using existing use case
    const baseStatsUseCase = new FetchBuildStatsFromDatabaseUseCase(
      this.workflowRunRepo,
      this.testResultRepo
    );
    const baseStats = await baseStatsUseCase.execute(build);

    // Fetch workflow runs from last 12 months for monthly stats
    const twelveMonthsAgo = this.getTwelveMonthsAgo();
    const now = new Date();
    const allRuns = await this.workflowRunRepo.findByBuildIdInDateRange(
      build.id,
      build.tenantId,
      twelveMonthsAgo,
      now
    );

    // Calculate monthly statistics
    const monthlyStats = this.calculateMonthlyStats(allRuns);

    // Calculate duration trends
    const durationTrends = this.calculateDurationTrends(allRuns);

    // Calculate monthly commits if GitHub client is available
    let monthlyCommits: MonthlyCommitStats[] = [];
    let contributors: Contributor[] = [];
    let mostUpdatedFiles: { path: string; updateCount: number; lastUpdated: Date }[] = [];

    if (this.githubClient) {
      try {
        // 1. Get current HEAD SHA (fast)
        let latestCommitSha: string | null = null;
        try {
          const lastCommit = await this.githubClient.fetchLastCommit(
            build.organization,
            build.repository
          );
          if (lastCommit) {
            latestCommitSha = lastCommit.sha;
          }
        } catch (e) {
          console.error('Failed to fetch latest commit SHA', e);
        }

        // 2. Check Cache
        const isCacheValid = latestCommitSha && build.lastAnalyzedCommitSha === latestCommitSha;
        const hasCachedFiles = build.mostUpdatedFiles && build.mostUpdatedFiles.length > 0;
        const hasCachedCommits = build.monthlyCommits && build.monthlyCommits.length > 0;

        if (isCacheValid && hasCachedFiles && hasCachedCommits) {
          console.log(`✅ Using cached stats for commit ${latestCommitSha}`);
          mostUpdatedFiles = build.mostUpdatedFiles!;
          monthlyCommits = build.monthlyCommits!;

          // Only fetch contributors (fast enough, usually)
          try {
            contributors = await this.githubClient.fetchContributorsList(
              build.organization,
              build.repository,
              50
            );
          } catch (e) { console.error('Failed to fetch contributors', e); }

        } else {
          console.log(`🔄 Cache miss or partial data (stored: ${build.lastAnalyzedCommitSha}, current: ${latestCommitSha}). Fetching fresh data...`);

          // Fetch everything in parallel
          const [contributorsList, activeFiles, calculatedMonthlyCommits] = await Promise.all([
            this.githubClient.fetchContributorsList(
              build.organization,
              build.repository,
              50
            ).catch(() => []),
            this.githubClient.fetchMostActiveFiles(
              build.organization,
              build.repository,
              100
            ).catch(() => []),
            this.calculateMonthlyCommits(build, this.githubClient).catch(() => this.getEmptyMonthlyCommits())
          ]);

          contributors = contributorsList;
          mostUpdatedFiles = activeFiles;
          monthlyCommits = calculatedMonthlyCommits;

          // Update cache
          if (latestCommitSha && (mostUpdatedFiles.length > 0 || monthlyCommits.length > 0)) {
            try {
              await this.buildRepo.update(build.id, {
                mostUpdatedFiles,
                monthlyCommits,
                lastAnalyzedCommitSha: latestCommitSha
              }, build.tenantId);
              console.log(`💾 Cache updated for build ${build.id} with commit ${latestCommitSha}`);
            } catch (err) {
              console.error('Failed to update build cache:', err);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch GitHub data:', error);
        monthlyCommits = this.getEmptyMonthlyCommits();
      }
    } else {
      monthlyCommits = this.getEmptyMonthlyCommits();
    }

    // Calculate test trend (all test runs over time)
    const testTrend = await this.calculateTestTrend(build, twelveMonthsAgo, now);

    return {
      ...baseStats,
      monthlyStats,
      monthlyCommits,
      testTrend,
      contributors,
      durationTrends,
      mostUpdatedFiles,
    };
  }

  private getTwelveMonthsAgo(): Date {
    const date = new Date();
    date.setMonth(date.getMonth() - 12);
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  private calculateMonthlyStats(runs: WorkflowRunRecord[]): MonthlyBuildStats[] {
    // Get last 12 months range
    const last12Months = getLastNMonthsRange(12);

    // Group runs by month
    const runsByMonth = new Map<string, WorkflowRunRecord[]>();

    runs.forEach((run) => {
      const month = formatDateYYYYMM(run.workflowCreatedAt);
      if (!runsByMonth.has(month)) {
        runsByMonth.set(month, []);
      }
      runsByMonth.get(month)!.push(run);
    });

    // Calculate stats for each month
    return last12Months.map((month) => {
      const monthRuns = runsByMonth.get(month) || [];
      const successCount = monthRuns.filter((run) => run.status === 'success').length;
      const failureCount = monthRuns.filter((run) => run.status === 'failure').length;
      const totalCount = monthRuns.length;

      return {
        month,
        successCount,
        failureCount,
        totalCount,
      };
    });
  }

  private calculateDurationTrends(runs: WorkflowRunRecord[]): DurationTrend[] {
    // Get last 12 months range
    const last12Months = getLastNMonthsRange(12);

    // Group runs by month (only those with duration data)
    const runsByMonth = new Map<string, WorkflowRunRecord[]>();

    runs.forEach((run) => {
      // Only include runs with duration data
      if (run.duration !== null && run.duration > 0) {
        const month = formatDateYYYYMM(run.workflowCreatedAt);
        if (!runsByMonth.has(month)) {
          runsByMonth.set(month, []);
        }
        runsByMonth.get(month)!.push(run);
      }
    });

    // Calculate duration stats for each month
    return last12Months.map((month) => {
      const monthRuns = runsByMonth.get(month) || [];

      if (monthRuns.length === 0) {
        return {
          period: month,
          avgDuration: 0,
          minDuration: 0,
          maxDuration: 0,
          count: 0,
        };
      }

      const durations = monthRuns.map((run) => run.duration!);
      const avgDuration = Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length);
      const minDuration = Math.min(...durations);
      const maxDuration = Math.max(...durations);

      return {
        period: month,
        avgDuration,
        minDuration,
        maxDuration,
        count: monthRuns.length,
      };
    });
  }

  private async calculateMonthlyCommits(
    build: Build,
    githubClient: GitHubClient
  ): Promise<MonthlyCommitStats[]> {
    const last12Months = getLastNMonthsRange(12);

    try {
      // Fetch all commits from last 12 months in ONE API call
      const twelveMonthsAgo = this.getTwelveMonthsAgo();
      const now = new Date();

      const commits = await githubClient.fetchCommitsWithDates(
        build.organization,
        build.repository,
        twelveMonthsAgo,
        now
      );

      // Group commits by month in memory
      const commitsByMonth = new Map<string, number>();

      for (const commit of commits) {
        const month = formatDateYYYYMM(commit.date);
        commitsByMonth.set(month, (commitsByMonth.get(month) || 0) + 1);
      }

      // Create monthly stats for all 12 months
      return last12Months.map((month) => ({
        month,
        commitCount: commitsByMonth.get(month) || 0,
      }));
    } catch (error) {
      console.error('Failed to fetch commits:', error);
      // Return empty data on error (graceful degradation)
      return this.getEmptyMonthlyCommits();
    }
  }

  private getEmptyMonthlyCommits(): MonthlyCommitStats[] {
    const last12Months = getLastNMonthsRange(12);
    return last12Months.map((month) => ({ month, commitCount: 0 }));
  }

  private async calculateTestTrend(
    build: Build,
    startDate: Date,
    endDate: Date
  ): Promise<TestTrendDataPoint[]> {
    try {
      // Fetch all workflow runs from last 12 months (sorted DESC by default)
      const allRuns = await this.workflowRunRepo.findByBuildIdInDateRange(
        build.id,
        build.tenantId,
        startDate,
        endDate
      );

      // For each workflow run, try to get its test results
      const testTrendData: TestTrendDataPoint[] = [];

      for (const run of allRuns) {
        const testResult = await this.testResultRepo.findByWorkflowRunId(run.id, build.tenantId);

        if (testResult) {
          testTrendData.push({
            date: run.workflowCreatedAt, // Use workflow run creation date, not parsedAt
            totalTests: testResult.totalTests,
            passedTests: testResult.passedTests,
            failedTests: testResult.failedTests,
            skippedTests: testResult.skippedTests,
          });
        }
      }

      // Reverse to get chronological order (oldest to newest) for the chart
      return testTrendData.reverse();
    } catch (error) {
      console.error('Failed to calculate test trend:', error);
      // Return empty data on error (graceful degradation)
      return [];
    }
  }
}
