import { NextResponse } from 'next/server';
import { DatabaseBuildRepository } from '@/infrastructure/DatabaseBuildRepository';
import { FetchBuildDetailsStatsUseCase } from '@/use-cases/fetchBuildDetailsStats';
import { DatabaseWorkflowRunRepository } from '@/infrastructure/DatabaseWorkflowRunRepository';
import { DatabaseTestResultRepository } from '@/infrastructure/DatabaseTestResultRepository';
import { getCurrentUser } from '@/infrastructure/auth-session';
import { DatabaseTenantMemberRepository } from '@/infrastructure/DatabaseTenantMemberRepository';
import { GitHubGraphQLClient } from '@/infrastructure/GitHubGraphQLClient';
import { CachedGitHubClient } from '@/infrastructure/CachedGitHubClient';
import { InMemoryGitHubDataCache } from '@/infrastructure/GitHubDataCache';
import { DatabaseAccessTokenRepository } from '@/infrastructure/DatabaseAccessTokenRepository';
import { decrypt } from '@/infrastructure/encryption';

const repository = new DatabaseBuildRepository();
const tenantMemberRepository = new DatabaseTenantMemberRepository();
const workflowRunRepository = new DatabaseWorkflowRunRepository();
const testResultRepository = new DatabaseTestResultRepository();
const accessTokenRepository = new DatabaseAccessTokenRepository();
const cache = new InMemoryGitHubDataCache();

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

    // Initialize GitHub client if build has a token
    let cachedGitHubClient: CachedGitHubClient | undefined;
    
    try {
      let token: string | null = null;

      // Try to get token from accessTokenId first
      if (build.accessTokenId) {
        const accessToken = await accessTokenRepository.findById(build.accessTokenId, tenantId);
        if (accessToken) {
          token = decrypt(accessToken.encryptedToken);
        }
      }

      // Fall back to personal access token if no shared token
      if (!token && build.personalAccessToken) {
        token = build.personalAccessToken;
      }

      // Create cached GitHub client if token is available
      if (token) {
        const githubClient = new GitHubGraphQLClient(token);
        cachedGitHubClient = new CachedGitHubClient(githubClient, cache);
      }
    } catch (error) {
      console.error('Failed to initialize GitHub client:', error);
      // Continue without GitHub client (will return empty commit data)
    }

    // Fetch extended statistics with monthly data
    const useCase = new FetchBuildDetailsStatsUseCase(
      workflowRunRepository,
      testResultRepository,
      cachedGitHubClient
    );
    const detailsStats = await useCase.execute(build);

    return NextResponse.json(detailsStats);
  } catch (error) {
    console.error('Failed to fetch build details stats:', error);

    return NextResponse.json(
      { error: 'Failed to fetch build details statistics' },
      { status: 500 }
    );
  }
}
