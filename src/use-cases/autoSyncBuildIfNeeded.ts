import type { Build } from '@/domain/models';
import type { GitHubClient } from '@/infrastructure/GitHubClient';
import type { BuildRepository } from '@/infrastructure/DatabaseBuildRepository';
import { SyncBuildHistoryUseCase } from './syncBuildHistory';
import type { WorkflowRunRepository } from '@/infrastructure/DatabaseWorkflowRunRepository';
import type { TestResultRepository } from '@/infrastructure/DatabaseTestResultRepository';
import type { BuildSyncStatusRepository } from '@/infrastructure/DatabaseBuildSyncStatusRepository';

/**
 * Automatically checks if there are new commits and syncs build history if needed.
 * This is called on page load to keep data fresh without manual intervention.
 */
export class AutoSyncBuildIfNeededUseCase {
  constructor(
    private githubClient: GitHubClient,
    private buildRepo: BuildRepository,
    private workflowRunRepo: WorkflowRunRepository,
    private testResultRepo: TestResultRepository,
    private syncStatusRepo: BuildSyncStatusRepository
  ) {}

  /**
   * Check if there are new commits and sync if needed.
   * Returns true if sync was performed, false if not needed.
   */
  async execute(build: Build): Promise<boolean> {
    try {
      // Fetch the latest commit from GitHub
      const lastCommit = await this.githubClient.fetchLastCommit(
        build.organization,
        build.repository
      );

      if (!lastCommit) {
        console.log(`⏭️ No commits found for ${build.organization}/${build.repository}`);
        return false;
      }

      // Check if we have this commit cached
      const cachedCommitSha = build.lastAnalyzedCommitSha;

      if (cachedCommitSha === lastCommit.sha) {
        // No new commits, no need to sync
        console.log(
          `✅ Build ${build.id} is up-to-date (commit ${lastCommit.sha.substring(0, 7)})`
        );
        return false;
      }

      // New commit detected! Sync the build history
      console.log(
        `🔄 New commit detected for build ${build.id}: ${cachedCommitSha?.substring(0, 7) || 'none'} → ${lastCommit.sha.substring(0, 7)}`
      );

      const syncUseCase = new SyncBuildHistoryUseCase(
        this.githubClient,
        this.workflowRunRepo,
        this.testResultRepo,
        this.syncStatusRepo
      );

      await syncUseCase.execute(build);

      console.log(`✅ Build ${build.id} synced successfully`);
      return true;
    } catch (error) {
      console.error(`Failed to auto-sync build ${build.id}:`, error);
      // Don't throw - we don't want to break page load if auto-sync fails
      return false;
    }
  }
}
