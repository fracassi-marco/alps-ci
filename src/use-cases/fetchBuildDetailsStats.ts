import type { Build, BuildDetailsStats, MonthlyBuildStats, MonthlyCommitStats, TestTrendDataPoint, WorkflowRunRecord, TestResultRecord } from '@/domain/models';
import type { WorkflowRunRepository } from '@/infrastructure/DatabaseWorkflowRunRepository';
import type { TestResultRepository } from '@/infrastructure/DatabaseTestResultRepository';
import type { CachedGitHubClient } from '@/infrastructure/CachedGitHubClient';
import { formatDateYYYYMM, getLastNMonthsRange } from '@/domain/utils';
import { FetchBuildStatsFromDatabaseUseCase } from './fetchBuildStatsFromDatabase';

/**
 * Fetches extended build statistics including monthly aggregations
 * for the build details page
 */
export class FetchBuildDetailsStatsUseCase {
  constructor(
    private workflowRunRepo: WorkflowRunRepository,
    private testResultRepo: TestResultRepository,
    private cachedGitHubClient?: CachedGitHubClient
  ) {}

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

    // Calculate monthly commits if GitHub client is available
    let monthlyCommits: MonthlyCommitStats[] = [];
    if (this.cachedGitHubClient) {
      try {
        monthlyCommits = await this.calculateMonthlyCommits(build, this.cachedGitHubClient);
      } catch (error) {
        console.error('Failed to fetch monthly commits:', error);
        // Return empty array on error (graceful degradation)
        monthlyCommits = this.getEmptyMonthlyCommits();
      }
    } else {
      // No GitHub client provided, return empty data
      monthlyCommits = this.getEmptyMonthlyCommits();
    }

    // Calculate test trend (all test runs over time)
    const testTrend = await this.calculateTestTrend(build, twelveMonthsAgo, now);

    return {
      ...baseStats,
      monthlyStats,
      monthlyCommits,
      testTrend,
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

  private async calculateMonthlyCommits(
    build: Build,
    cachedClient: CachedGitHubClient
  ): Promise<MonthlyCommitStats[]> {
    const last12Months = getLastNMonthsRange(12);

    // Fetch commits for each month in parallel
    const monthlyCommits = await Promise.all(
      last12Months.map(async (month) => {
        const [year, monthNum] = month.split('-');
        
        // Create date range for this month (first day to last day)
        const startDate = new Date(parseInt(year!), parseInt(monthNum!) - 1, 1, 0, 0, 0, 0);
        const endDate = new Date(parseInt(year!), parseInt(monthNum!), 0, 23, 59, 59, 999);

        try {
          const commitCount = await cachedClient.fetchCommits(
            build.organization,
            build.repository,
            build.cacheExpirationMinutes,
            startDate,
            endDate
          );

          return { month, commitCount };
        } catch (error) {
          console.error(`Failed to fetch commits for ${month}:`, error);
          return { month, commitCount: 0 };
        }
      })
    );

    return monthlyCommits;
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
