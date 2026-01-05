import { NextResponse } from 'next/server';
import { FileSystemBuildRepository } from '@/infrastructure/FileSystemBuildRepository';
import { GitHubGraphQLClient, GitHubAuthenticationError } from '@/infrastructure/GitHubGraphQLClient';
import { InMemoryGitHubDataCache } from '@/infrastructure/GitHubDataCache';
import { CachedGitHubClient } from '@/infrastructure/CachedGitHubClient';
import { FetchBuildStatsUseCase } from '@/use-cases/fetchBuildStats';

const repository = new FileSystemBuildRepository();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Find the build
    const builds = await repository.findAll();
    const build = builds.find((b) => b.id === id);

    if (!build) {
      return NextResponse.json({ error: 'Build not found' }, { status: 404 });
    }

    // Create GitHub client with the build's PAT
    const githubClient = new GitHubGraphQLClient(build.personalAccessToken);
    const cache = new InMemoryGitHubDataCache();
    const cachedClient = new CachedGitHubClient(githubClient, cache);

    // Fetch statistics
    const useCase = new FetchBuildStatsUseCase(cachedClient);
    const stats = await useCase.execute(build);

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Failed to fetch build stats:', error);

    if (error instanceof GitHubAuthenticationError) {
      return NextResponse.json(
        { error: 'Invalid or expired Personal Access Token. Please update your PAT.' },
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
    const { id } = await params;

    // Find the build
    const builds = await repository.findAll();
    const build = builds.find((b) => b.id === id);

    if (!build) {
      return NextResponse.json({ error: 'Build not found' }, { status: 404 });
    }

    // Create GitHub client with the build's PAT
    const githubClient = new GitHubGraphQLClient(build.personalAccessToken);
    const cache = new InMemoryGitHubDataCache();
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

