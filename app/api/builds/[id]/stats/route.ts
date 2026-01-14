import { NextResponse } from 'next/server';
import { DatabaseBuildRepository } from '@/infrastructure/DatabaseBuildRepository';
import { GitHubGraphQLClient, GitHubAuthenticationError } from '@/infrastructure/GitHubGraphQLClient';
import { getGitHubDataCache } from '@/infrastructure/cache-instance';
import { CachedGitHubClient } from '@/infrastructure/CachedGitHubClient';
import { FetchBuildStatsUseCase } from '@/use-cases/fetchBuildStats';
import { getCurrentUser } from '@/infrastructure/auth-session';
import { DatabaseTenantMemberRepository } from '@/infrastructure/DatabaseTenantMemberRepository';

const repository = new DatabaseBuildRepository();
const tenantMemberRepository = new DatabaseTenantMemberRepository();

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

    // Create GitHub client with the build's PAT and use singleton cache
    const githubClient = new GitHubGraphQLClient(build.personalAccessToken);
    const cache = getGitHubDataCache();
    const cachedClient = new CachedGitHubClient(githubClient, cache);

    // Fetch statistics
    const useCase = new FetchBuildStatsUseCase(cachedClient);
    const stats = await useCase.execute(build);

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

    // Create GitHub client with the build's PAT and use singleton cache
    const githubClient = new GitHubGraphQLClient(build.personalAccessToken);
    const cache = getGitHubDataCache();
    const cachedClient = new CachedGitHubClient(githubClient, cache);

    // Invalidate cache for this repository
    cachedClient.invalidateRepository(build.organization, build.repository);

    // Fetch fresh statistics
    const useCase = new FetchBuildStatsUseCase(cachedClient);
    const stats = await useCase.execute(build);

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

