import { NextResponse } from 'next/server';
import { DatabaseBuildRepository } from '@/infrastructure/DatabaseBuildRepository';
import { GitHubGraphQLClient, GitHubAuthenticationError } from '@/infrastructure/GitHubGraphQLClient';
import { FetchBuildStatsFromDatabaseUseCase } from '@/use-cases/fetchBuildStatsFromDatabase';
import { SyncBuildHistoryUseCase } from '@/use-cases/syncBuildHistory';
import { AutoSyncBuildIfNeededUseCase } from '@/use-cases/autoSyncBuildIfNeeded';
import { DatabaseWorkflowRunRepository } from '@/infrastructure/DatabaseWorkflowRunRepository';
import { DatabaseTestResultRepository } from '@/infrastructure/DatabaseTestResultRepository';
import { DatabaseBuildSyncStatusRepository } from '@/infrastructure/DatabaseBuildSyncStatusRepository';
import { getCurrentUser } from '@/infrastructure/auth-session';
import { DatabaseTenantMemberRepository } from '@/infrastructure/DatabaseTenantMemberRepository';
import { DatabaseAccessTokenRepository } from '@/infrastructure/DatabaseAccessTokenRepository';
import { TokenResolutionService } from '@/infrastructure/TokenResolutionService';

const repository = new DatabaseBuildRepository();
const tenantMemberRepository = new DatabaseTenantMemberRepository();
const accessTokenRepository = new DatabaseAccessTokenRepository();
const tokenResolutionService = new TokenResolutionService(accessTokenRepository);
const workflowRunRepository = new DatabaseWorkflowRunRepository();
const testResultRepository = new DatabaseTestResultRepository();
const syncStatusRepository = new DatabaseBuildSyncStatusRepository();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;

    // Find the build (scoped to tenant)
    const build = await repository.findById(id, tenantId);

    if (!build) {
      return NextResponse.json({ error: 'Build not found' }, { status: 404 });
    }

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
      repository // Inject BuildRepository for caching
    );
    const stats = await useCase.execute(updatedBuild);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch build stats:', error);

    if (error instanceof GitHubAuthenticationError) {
      return NextResponse.json(
        { error: 'Invalid or expired Access Token. Please update it.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch build statistics' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Manual refresh - invalidate cache and fetch fresh data
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
    const { id } = await params;

    // Find the build (scoped to tenant)
    const build = await repository.findById(id, tenantId);

    if (!build) {
      return NextResponse.json({ error: 'Build not found' }, { status: 404 });
    }

    // Resolve the GitHub access token (either from saved token or inline)
    const githubToken = await tokenResolutionService.resolveToken({
      accessTokenId: build.accessTokenId,
      inlineToken: build.personalAccessToken,
      tenantId,
    });

    // Create GitHub client with the resolved token
    const githubClient = new GitHubGraphQLClient(githubToken);

    // Sync workflow runs from GitHub to database
    const syncUseCase = new SyncBuildHistoryUseCase(
      githubClient,
      workflowRunRepository,
      testResultRepository,
      syncStatusRepository
    );

    await syncUseCase.execute(build);

    // Fetch fresh statistics from database
    const fetchUseCase = new FetchBuildStatsFromDatabaseUseCase(
      workflowRunRepository,
      testResultRepository,
      githubClient,
      repository // Inject BuildRepository for caching
    );
    const stats = await fetchUseCase.execute(build);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to refresh build stats:', error);

    if (error instanceof GitHubAuthenticationError) {
      return NextResponse.json(
        { error: 'Invalid or expired Personal Access Token. Please update your PAT.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to refresh build statistics' },
      { status: 500 }
    );
  }
}

