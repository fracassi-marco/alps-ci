import { NextResponse } from 'next/server';
import { DatabaseBuildRepository } from '@/infrastructure/DatabaseBuildRepository';
import { GitHubGraphQLClient, GitHubAuthenticationError } from '@/infrastructure/GitHubGraphQLClient';
import { FetchBuildStatsFromDatabaseUseCase } from '@/use-cases/fetchBuildStatsFromDatabase';
import { AutoSyncBuildIfNeededUseCase } from '@/use-cases/autoSyncBuildIfNeeded';
import { DatabaseWorkflowRunRepository } from '@/infrastructure/DatabaseWorkflowRunRepository';
import { DatabaseTestResultRepository } from '@/infrastructure/DatabaseTestResultRepository';
import { DatabaseBuildSyncStatusRepository } from '@/infrastructure/DatabaseBuildSyncStatusRepository';
import { getCurrentUser } from '@/infrastructure/auth-session';
import { DatabaseTenantMemberRepository } from '@/infrastructure/DatabaseTenantMemberRepository';
import { DatabaseAccessTokenRepository } from '@/infrastructure/DatabaseAccessTokenRepository';
import { TokenResolutionService } from '@/infrastructure/TokenResolutionService';
import type { BuildStats } from '@/domain/models';

const repository = new DatabaseBuildRepository();
const tenantMemberRepository = new DatabaseTenantMemberRepository();
const accessTokenRepository = new DatabaseAccessTokenRepository();
const tokenResolutionService = new TokenResolutionService(accessTokenRepository);
const workflowRunRepository = new DatabaseWorkflowRunRepository();
const testResultRepository = new DatabaseTestResultRepository();
const syncStatusRepository = new DatabaseBuildSyncStatusRepository();

interface BatchStatsResponse {
  [buildId: string]: {
    stats: BuildStats | null;
    error: string | null;
  };
}

export async function POST(request: Request) {
  try {
    // Get current user from session
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // Get user's tenant memberships
    const memberships = await tenantMemberRepository.findByUserId(currentUser.id);
    if (memberships.length === 0) {
      return NextResponse.json(
        { error: 'No tenant membership found' },
        { status: 404 }
      );
    }

    const tenantId = memberships[0]!.tenantId;

    // Parse request body to get build IDs
    const body = await request.json();
    const buildIds: string[] = body.buildIds || [];

    if (!Array.isArray(buildIds) || buildIds.length === 0) {
      return NextResponse.json(
        { error: 'buildIds array is required' },
        { status: 400 }
      );
    }

    // Fetch all builds in parallel (scoped to tenant)
    const buildPromises = buildIds.map((id) => 
      repository.findById(id, tenantId).catch(() => null)
    );
    const builds = await Promise.all(buildPromises);

    // Build the response object
    const response: BatchStatsResponse = {};

    // Fetch stats for each build in parallel
    const statsPromises = builds.map(async (build, index) => {
      const buildId = buildIds[index]!;

      if (!build) {
        response[buildId] = {
          stats: null,
          error: 'Build not found',
        };
        return;
      }

      try {
        // Resolve the GitHub access token (either from saved token or inline)
        const githubToken = await tokenResolutionService.resolveToken({
          accessTokenId: build.accessTokenId,
          inlineToken: build.personalAccessToken,
          tenantId,
        });

        // Create GitHub client with the resolved token
        const githubClient = new GitHubGraphQLClient(githubToken);

        // Auto-sync if there are new commits (BLOCKING)
        // If new commits are detected, wait for sync to complete before returning data
        const autoSyncUseCase = new AutoSyncBuildIfNeededUseCase(
          githubClient,
          repository,
          workflowRunRepository,
          testResultRepository,
          syncStatusRepository
        );
        
        // Wait for sync if new commits detected
        const wasSynced = await autoSyncUseCase.execute(build);
        
        // If data was synced, refresh the build from DB to get updated lastAnalyzedCommitSha
        let updatedBuild = build;
        if (wasSynced) {
          const refreshedBuild = await repository.findById(build.id, tenantId);
          if (refreshedBuild) {
            updatedBuild = refreshedBuild;
          }
        }

        // Fetch statistics from database (will include newly synced data if sync occurred)
        const useCase = new FetchBuildStatsFromDatabaseUseCase(
          workflowRunRepository,
          testResultRepository,
          githubClient,
          repository
        );
        const stats = await useCase.execute(updatedBuild);

        response[buildId] = {
          stats,
          error: null,
        };
      } catch (error) {
        console.error(`Failed to fetch stats for build ${buildId}:`, error);

        if (error instanceof GitHubAuthenticationError) {
          response[buildId] = {
            stats: null,
            error: 'Invalid or expired Access Token. Please update it.',
          };
        } else {
          response[buildId] = {
            stats: null,
            error: 'Failed to fetch statistics',
          };
        }
      }
    });

    // Wait for all stats to be fetched
    await Promise.all(statsPromises);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch batch build stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch batch build statistics' },
      { status: 500 }
    );
  }
}
