import type { Build, BuildStats, DailySuccess, WorkflowRun, TestStats, WorkflowRunRecord } from '@/domain/models';
import type { GitHubClient } from '@/infrastructure/GitHubClient';
import type { WorkflowRunRepository } from '@/infrastructure/DatabaseWorkflowRunRepository';
import type { TestResultRepository } from '@/infrastructure/DatabaseTestResultRepository';
import type { BuildRepository } from '@/infrastructure/DatabaseBuildRepository';
import { calculateHealthPercentage, formatDateYYYYMMDD, getLastNDaysRange } from '@/domain/utils';

/**
 * Fetches build statistics from the database (for fast loading)
 * with optional GitHub refresh capability
 */
export class FetchBuildStatsFromDatabaseUseCase {
  constructor(
    private workflowRunRepo: WorkflowRunRepository,
    private testResultRepo: TestResultRepository,
    private githubClient?: GitHubClient,
    private buildRepo?: BuildRepository
  ) { }

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
          let latestCommitSha: string | null = null;

          // Fetch last commit to get SHA and commit info
          const lastCommitData = await this.githubClient.fetchLastCommit(
            build.organization,
            build.repository
          );

          if (lastCommitData) {
            latestCommitSha = lastCommitData.sha;
            lastCommit = {
              message: lastCommitData.message,
              date: lastCommitData.date,
              author: lastCommitData.author,
              sha: lastCommitData.sha,
              url: lastCommitData.url,
            };
          }

          const isCacheValid = latestCommitSha && build.lastAnalyzedCommitSha === latestCommitSha;

          // Check if we have cached metadata
          if (isCacheValid && build.tags && build.totalCommits !== undefined && build.totalContributors !== undefined) {
            console.log(`💾 Using cached base stats for commit ${latestCommitSha?.substring(0, 7)}`);
            lastTag = build.tags.length > 0 ? (build.tags[0] ?? null) : null;
            totalCommits = build.totalCommits;
            totalContributors = build.totalContributors;

            // Use cached 7-day data (same commit SHA = same 7-day window)
            if (build.cachedCommitsLast7Days !== undefined && 
                build.cachedContributorsLast7Days !== undefined) {
              commitsLast7Days = build.cachedCommitsLast7Days;
              contributorsLast7Days = build.cachedContributorsLast7Days;
            } else {
              // Cache exists but missing 7-day data, fetch it
              console.log(`🔄 Fetching missing 7-day stats for build ${build.name}`);
              try {
                const [last7dCommits, last7dContribs] = await Promise.all([
                  this.githubClient.fetchCommits(build.organization, build.repository, sevenDaysAgo, new Date()).catch(() => 0),
                  this.githubClient.fetchContributors(build.organization, build.repository, sevenDaysAgo).catch(() => 0)
                ]);
                commitsLast7Days = last7dCommits;
                contributorsLast7Days = last7dContribs;
                
                // Update cache
                if (this.buildRepo) {
                  try {
                    await this.buildRepo.update(build.id, {
                      cachedCommitsLast7Days: commitsLast7Days,
                      cachedContributorsLast7Days: contributorsLast7Days,
                    }, build.tenantId);
                  } catch (e) {
                    console.error('Failed to cache 7-day stats', e);
                  }
                }
              } catch (e) {
                console.error('Failed to fetch time-windowed stats', e);
                // Fallback to old cached values if available
                commitsLast7Days = build.cachedCommitsLast7Days ?? 0;
                contributorsLast7Days = build.cachedContributorsLast7Days ?? 0;
              }
            }
          } else {
            console.log(`🔄 Refreshing base stats (new commits detected)`);

            // Fetch all metadata from GitHub
            const [tags, commits, contributors, last7dCommits, last7dContribs] = await Promise.all([
              this.githubClient.fetchTags(build.organization, build.repository, 50).catch(() => []),
              this.githubClient.fetchCommits(build.organization, build.repository).catch(() => 0),
              this.githubClient.fetchTotalContributors(build.organization, build.repository).catch(() => 0),
              this.githubClient.fetchCommits(build.organization, build.repository, sevenDaysAgo, new Date()).catch(() => 0),
              this.githubClient.fetchContributors(build.organization, build.repository, sevenDaysAgo).catch(() => 0)
            ]);

            lastTag = tags.length > 0 ? (tags[0] ?? null) : null;
            totalCommits = commits;
            totalContributors = contributors;
            commitsLast7Days = last7dCommits;
            contributorsLast7Days = last7dContribs;

            // Update cache (including time-windowed data)
            if (this.buildRepo && latestCommitSha) {
              try {
                await this.buildRepo.update(build.id, {
                  tags,
                  totalCommits,
                  totalContributors,
                  lastAnalyzedCommitSha: latestCommitSha,
                  cachedCommitsLast7Days: commitsLast7Days,
                  cachedContributorsLast7Days: contributorsLast7Days,
                }, build.tenantId);
                console.log(`💾 Dashboard properties cached for build ${build.id}`);
              } catch (e) {
                console.error('Failed to cache dashboard stats', e);
              }
            }
          }

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
