import type { Build, BuildStats, WorkflowRun, DailySuccess } from '../domain/models';
import type { CachedGitHubClient } from '../infrastructure/CachedGitHubClient';
import { calculateHealthPercentage, getLastNDaysRange, formatDateYYYYMMDD } from '../domain/utils';

export class FetchBuildStatsUseCase {
  constructor(private githubClient: CachedGitHubClient) {}

  async execute(build: Build): Promise<BuildStats> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Fetch workflow runs for the last 7 days
      const allRuns = await this.fetchWorkflowRunsForSelectors(
        build,
        sevenDaysAgo
      );

      // Get last 7 days range for the bar chart
      const last7Days = getLastNDaysRange(7);

      // Calculate statistics
      const totalExecutions = allRuns.length;
      const successfulExecutions = allRuns.filter((run) => run.status === 'success').length;
      const failedExecutions = allRuns.filter((run) => run.status === 'failure').length;
      const healthPercentage = calculateHealthPercentage(successfulExecutions, totalExecutions);


      // Build daily success counts for bar chart
      const last7DaysSuccesses: DailySuccess[] = last7Days.map((date) => {
        const dateStr = formatDateYYYYMMDD(date);
        const successCount = allRuns.filter(
          (run) =>
            run.status === 'success' &&
            formatDateYYYYMMDD(run.createdAt) === dateStr
        ).length;

        return {
          date: dateStr,
          successCount,
        };
      });

      // Get last tag
      const lastTag = await this.githubClient.fetchLatestTag(
        build.organization,
        build.repository,
        build.cacheExpirationMinutes
      );

      // Get last 3 runs for links
      const recentRuns = allRuns.slice(0, 3);

      return {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        healthPercentage,
        lastTag,
        last7DaysSuccesses,
        recentRuns,
        lastFetchedAt: new Date(),
      };
    } catch (error) {
      throw error;
    }
  }

  private async fetchWorkflowRunsForSelectors(
    build: Build,
    since: Date
  ): Promise<WorkflowRun[]> {
    const allRuns: WorkflowRun[] = [];

    for (const selector of build.selectors) {
      let runs: WorkflowRun[] = [];

      switch (selector.type) {
        case 'branch':
          runs = await this.githubClient.fetchWorkflowRuns(
            build.organization,
            build.repository,
            build.cacheExpirationMinutes,
            { branch: selector.pattern, since, limit: 100 }
          );
          break;

        case 'workflow':
          runs = await this.githubClient.fetchWorkflowRuns(
            build.organization,
            build.repository,
            build.cacheExpirationMinutes,
            { workflowName: selector.pattern, since, limit: 100 }
          );
          break;

        case 'tag':
          // For tag selectors, fetch all tags and filter by pattern, then get runs for matching tags
          const allTags = await this.githubClient.fetchTags(
            build.organization,
            build.repository,
            build.cacheExpirationMinutes,
            100
          );

          // Filter tags that match the pattern (support wildcards)
          const matchingTags = allTags.filter((tag) =>
            this.matchesPattern(tag, selector.pattern)
          );

          // Fetch all workflow runs and filter by matching tags
          if (matchingTags.length > 0) {
            const allWorkflowRuns = await this.githubClient.fetchWorkflowRuns(
              build.organization,
              build.repository,
              build.cacheExpirationMinutes,
              { since, limit: 100 }
            );

            // Filter runs that were triggered by the matching tags
            // GitHub exposes the tag/branch name in the headBranch field
            runs = allWorkflowRuns.filter((run) => {
              // Check if headBranch matches any of our tags
              if (run.headBranch) {
                return matchingTags.some((tag) =>
                  run.headBranch === tag ||
                  run.headBranch === `refs/tags/${tag}`
                );
              }
              return false;
            });
          }
          break;
      }

      // Merge runs, avoiding duplicates by ID
      for (const run of runs) {
        if (!allRuns.find((r) => r.id === run.id)) {
          allRuns.push(run);
        }
      }
    }

    // Sort by creation date (newest first)
    allRuns.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return allRuns;
  }

  private matchesPattern(value: string, pattern: string): boolean {
    // Convert wildcard pattern to regex
    // Support * (match any characters) and ? (match single character)
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
      .replace(/\*/g, '.*') // * matches any characters
      .replace(/\?/g, '.'); // ? matches single character

    const regex = new RegExp(`^${regexPattern}$`, 'i'); // Case insensitive
    return regex.test(value);
  }
}

