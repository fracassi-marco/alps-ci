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
    // Separate selectors by type
    const branchSelectors = build.selectors.filter(s => s.type === 'branch');
    const tagSelectors = build.selectors.filter(s => s.type === 'tag');
    const workflowSelectors = build.selectors.filter(s => s.type === 'workflow');

    let runs: WorkflowRun[] = [];

    // Special case: If we have both branch AND tag selectors, we want runs from tags only
    // because a tag run IS associated with a branch (the branch it was created from)
    if (branchSelectors.length > 0 && tagSelectors.length > 0) {
      // Fetch tag runs only - tags are created FROM branches, so tag runs implicitly include branch context
      for (const tagSelector of tagSelectors) {
        const allTags = await this.githubClient.fetchTags(
          build.organization,
          build.repository,
          build.cacheExpirationMinutes,
          100
        );

        const matchingTags = allTags.filter((tag) =>
          this.matchesPattern(tag, tagSelector.pattern)
        );

        if (matchingTags.length > 0) {
          const allWorkflowRuns = await this.githubClient.fetchWorkflowRuns(
            build.organization,
            build.repository,
            build.cacheExpirationMinutes,
            { since, limit: 100 }
          );

          const tagRuns = allWorkflowRuns.filter((run) => {
            if (run.headBranch) {
              return matchingTags.some((tag) =>
                run.headBranch === tag ||
                run.headBranch === `refs/tags/${tag}`
              );
            }
            return false;
          });

          // Add tag runs
          for (const run of tagRuns) {
            if (!runs.find((r) => r.id === run.id)) {
              runs.push(run);
            }
          }
        }
      }
    } else {
      // Standard logic: fetch runs for each selector and merge (OR logic)
      for (const selector of build.selectors) {
        let selectorRuns: WorkflowRun[] = [];

        switch (selector.type) {
          case 'branch':
            selectorRuns = await this.githubClient.fetchWorkflowRuns(
              build.organization,
              build.repository,
              build.cacheExpirationMinutes,
              { branch: selector.pattern, since, limit: 100 }
            );
            break;

          case 'workflow':
            selectorRuns = await this.githubClient.fetchWorkflowRuns(
              build.organization,
              build.repository,
              build.cacheExpirationMinutes,
              { workflowName: selector.pattern, since, limit: 100 }
            );
            break;

          case 'tag':
            const allTags = await this.githubClient.fetchTags(
              build.organization,
              build.repository,
              build.cacheExpirationMinutes,
              100
            );

            const matchingTags = allTags.filter((tag) =>
              this.matchesPattern(tag, selector.pattern)
            );

            if (matchingTags.length > 0) {
              const allWorkflowRuns = await this.githubClient.fetchWorkflowRuns(
                build.organization,
                build.repository,
                build.cacheExpirationMinutes,
                { since, limit: 100 }
              );

              selectorRuns = allWorkflowRuns.filter((run) => {
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

        // Merge runs
        for (const run of selectorRuns) {
          if (!runs.find((r) => r.id === run.id)) {
            runs.push(run);
          }
        }
      }
    }

    // Sort by creation date (newest first)
    runs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return runs;
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

