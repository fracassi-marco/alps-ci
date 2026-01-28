import type { Build, BuildDetailsStats, MonthlyBuildStats, WorkflowRunRecord } from '@/domain/models';
import type { WorkflowRunRepository } from '@/infrastructure/DatabaseWorkflowRunRepository';
import type { TestResultRepository } from '@/infrastructure/DatabaseTestResultRepository';
import { formatDateYYYYMM, getLastNMonthsRange } from '@/domain/utils';
import { FetchBuildStatsFromDatabaseUseCase } from './fetchBuildStatsFromDatabase';

/**
 * Fetches extended build statistics including monthly aggregations
 * for the build details page
 */
export class FetchBuildDetailsStatsUseCase {
  constructor(
    private workflowRunRepo: WorkflowRunRepository,
    private testResultRepo: TestResultRepository
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

    return {
      ...baseStats,
      monthlyStats,
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
}
