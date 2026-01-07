import type { Build, BuildStats, WorkflowRun, DailySuccess } from '../domain/models';
import type { CachedGitHubClient } from '../infrastructure/CachedGitHubClient';
import { calculateHealthPercentage, getLastNDaysRange, formatDateYYYYMMDD } from '../domain/utils';

export class FetchBuildStatsUseCase {
  constructor(private githubClient: CachedGitHubClient) {}

  async execute(build: Build): Promise<BuildStats> {
    try {
      // Calculate start of the 7-day window (today + 6 days ago = 7 days total)
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

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


      // Build daily success and failure counts for stacked bar chart
      const last7DaysSuccesses: DailySuccess[] = last7Days.map((date) => {
        const dateStr = formatDateYYYYMMDD(date);
        const successCount = allRuns.filter(
          (run) =>
            run.status === 'success' &&
            formatDateYYYYMMDD(run.createdAt) === dateStr
        ).length;
        const failureCount = allRuns.filter(
          (run) =>
            run.status === 'failure' &&
            formatDateYYYYMMDD(run.createdAt) === dateStr
        ).length;

        return {
          date: dateStr,
          successCount,
          failureCount,
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
    // Fetch all workflow runs since the specified date
    const allWorkflowRuns = await this.githubClient.fetchWorkflowRuns(
      build.organization,
      build.repository,
      build.cacheExpirationMinutes,
      { since, limit: 100 }
    );

    // Fetch all tags for tag matching
    const allTags = await this.githubClient.fetchTags(
      build.organization,
      build.repository,
      build.cacheExpirationMinutes,
      100
    );

    // Filter runs that match ALL selectors (AND logic)
    const filteredRuns = allWorkflowRuns.filter((run) => {
      // A run must match ALL selectors
      return build.selectors.every((selector) => {
        switch (selector.type) {
          case 'branch':
            // Check if run's headBranch matches the branch pattern
            return run.headBranch && this.matchesPattern(run.headBranch, selector.pattern);

          case 'workflow':
            // Check if run's workflow name matches the workflow pattern
            return run.name && this.matchesPattern(run.name, selector.pattern);

          case 'tag':
            // Check if run's headBranch is a tag that matches the tag pattern
            if (!run.headBranch) return false;

            // Get all tags matching the pattern
            const matchingTags = allTags.filter((tag) =>
              this.matchesPattern(tag, selector.pattern)
            );

            // Check if run's headBranch is one of the matching tags
            return matchingTags.some((tag) =>
              run.headBranch === tag || run.headBranch === `refs/tags/${tag}`
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

