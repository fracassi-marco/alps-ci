import { NextResponse } from 'next/server';
import { DatabaseBuildRepository } from '@/infrastructure/DatabaseBuildRepository';
import { DatabaseAccessTokenRepository } from '@/infrastructure/DatabaseAccessTokenRepository';
import { AddBuildUseCase } from '@/use-cases/addBuild';
import { ListBuildsUseCase } from '@/use-cases/listBuilds';
import { ValidationError } from '@/domain/validation';
import { getCurrentUser } from '@/infrastructure/auth-session';
import { DatabaseTenantMemberRepository } from '@/infrastructure/DatabaseTenantMemberRepository';
import { GitHubGraphQLClient } from '@/infrastructure/GitHubGraphQLClient';
import { getGitHubDataCache } from '@/infrastructure/cache-instance';
import { CachedGitHubClient } from '@/infrastructure/CachedGitHubClient';
import { SyncBuildHistoryUseCase } from '@/use-cases/syncBuildHistory';
import { DatabaseWorkflowRunRepository } from '@/infrastructure/DatabaseWorkflowRunRepository';
import { DatabaseTestResultRepository } from '@/infrastructure/DatabaseTestResultRepository';
import { DatabaseBuildSyncStatusRepository } from '@/infrastructure/DatabaseBuildSyncStatusRepository';
import { TokenResolutionService } from '@/infrastructure/TokenResolutionService';
import type { Build } from '@/domain/models';

const repository = new DatabaseBuildRepository();
const tenantMemberRepository = new DatabaseTenantMemberRepository();
const accessTokenRepository = new DatabaseAccessTokenRepository();

export async function GET() {
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

    // Use first membership (primary tenant)
    const membership = memberships[0];
    if (!membership) {
      return NextResponse.json(
        { error: 'No tenant membership found' },
        { status: 404 }
      );
    }

    const useCase = new ListBuildsUseCase(repository);
    const builds = await useCase.execute(membership.tenantId);
    return NextResponse.json(builds);
  } catch (error) {
    console.error('Failed to fetch builds:', error);
    return NextResponse.json({ error: 'Failed to fetch builds' }, { status: 500 });
  }
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

    // Use first membership (primary tenant)
    const membership = memberships[0];
    if (!membership) {
      return NextResponse.json(
        { error: 'No tenant membership found' },
        { status: 404 }
      );
    }

    const newBuild = await request.json();
    const useCase = new AddBuildUseCase(repository, accessTokenRepository);
    const savedBuild = await useCase.execute(newBuild, membership.tenantId);

    // Trigger initial backfill asynchronously (fire-and-forget)
    triggerInitialBackfill(savedBuild, membership.tenantId).catch(err => {
      console.error(`[Initial Backfill] Failed for build ${savedBuild.id}:`, err);
      // Error is already stored in sync_status table by SyncBuildHistoryUseCase
    });

    return NextResponse.json(savedBuild, { status: 201 });
  } catch (error) {
    console.error('Failed to add build:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ error: 'Failed to add build' }, { status: 500 });
  }
}

/**
 * Triggers initial historical data backfill for a newly created build.
 * Runs asynchronously without blocking the API response.
 * 
 * Fetches:
 * - ALL workflow runs from repository history (no date/count limit)
 * - Test results for LAST 50 runs only
 * 
 * @param build The newly created build
 * @param tenantId The tenant ID for proper scoping
 */
async function triggerInitialBackfill(build: Build, tenantId: string): Promise<void> {
  try {
    console.log(`[Initial Backfill] Starting for build: ${build.name} (${build.id})`);

    // 1. Resolve GitHub access token
    const tokenService = new TokenResolutionService(accessTokenRepository);
    const githubToken = await tokenService.resolveToken({
      accessTokenId: build.accessTokenId,
      inlineToken: build.personalAccessToken,
      tenantId,
    });

    if (!githubToken) {
      throw new Error('No GitHub access token available for this build');
    }

    // 2. Create GitHub client with cache
    const githubClient = new GitHubGraphQLClient(githubToken);
    const cache = getGitHubDataCache();
    const cachedClient = new CachedGitHubClient(githubClient, cache);

    // 3. Create repository instances
    const workflowRunRepo = new DatabaseWorkflowRunRepository();
    const testResultRepo = new DatabaseTestResultRepository();
    const syncStatusRepo = new DatabaseBuildSyncStatusRepository();

    // 4. Execute sync with full backfill
    const syncUseCase = new SyncBuildHistoryUseCase(
      cachedClient,
      workflowRunRepo,
      testResultRepo,
      syncStatusRepo
    );

    const result = await syncUseCase.execute(build);
    
    console.log(
      `[Initial Backfill] Completed for ${build.name}: ` +
      `${result.newRunsSynced} runs synced, ` +
      `${result.testResultsParsed} test results parsed`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during initial backfill';
    console.error(`[Initial Backfill] Failed for ${build.name}:`, errorMessage);
    
    // Error is already stored in sync_status table by SyncBuildHistoryUseCase.execute()
    // The BuildCard component will detect and display it
    throw error; // Re-throw so .catch() in POST handler logs it
  }
}

