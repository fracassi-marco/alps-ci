
import { DatabaseBuildRepository } from '@/infrastructure/DatabaseBuildRepository';
import { DatabaseTenantMemberRepository } from '@/infrastructure/DatabaseTenantMemberRepository';
import { DatabaseWorkflowRunRepository } from '@/infrastructure/DatabaseWorkflowRunRepository';
import { DatabaseTestResultRepository } from '@/infrastructure/DatabaseTestResultRepository';
import { DatabaseAccessTokenRepository } from '@/infrastructure/DatabaseAccessTokenRepository';
import { FetchBuildDetailsStatsUseCase } from '@/use-cases/fetchBuildDetailsStats';
import { GitHubGraphQLClient } from '@/infrastructure/GitHubGraphQLClient';
import { decrypt } from '@/infrastructure/encryption';
import type { GitHubClient } from '@/infrastructure/GitHubClient';
import { db } from '@/infrastructure/database/client';
import { builds } from '@/infrastructure/database/schema';
import { desc } from 'drizzle-orm';

async function measurePerformance() {
    console.log('🔄 Init repositories...');
    const buildRepo = new DatabaseBuildRepository();
    const workflowRunRepo = new DatabaseWorkflowRunRepository();
    const testResultRepo = new DatabaseTestResultRepository();
    const accessTokenRepo = new DatabaseAccessTokenRepository();

    console.log('🔍 Finding a recent build...');
    // Find the most recent build to test with
    const [recentBuild] = await db.select().from(builds).orderBy(desc(builds.updatedAt)).limit(1);

    if (!recentBuild) {
        console.error('❌ No builds found in database to test.');
        process.exit(1);
    }

    const tenantId = recentBuild.tenantId;
    const buildId = recentBuild.id;

    console.log(`📌 Using latest build: ${recentBuild.name} (${buildId})`);
    console.log(`   Repo: ${recentBuild.organization}/${recentBuild.repository}`);

    // Re-fetch using repository to get full domain model
    const build = await buildRepo.findById(buildId, tenantId);
    if (!build) {
        console.error('❌ Build not found via repository.');
        process.exit(1);
    }

    // Initialize GitHub client logic (copied from route.ts)
    let githubClient: GitHubClient | undefined;

    try {
        let token: string | null = null;

        // Try to get token from accessTokenId first
        if (build.accessTokenId) {
            const accessToken = await accessTokenRepo.findById(build.accessTokenId, tenantId);
            if (accessToken) {
                token = decrypt(accessToken.encryptedToken);
                console.log('🔑 Using shared access token');
            }
        }

        // Fall back to personal access token if no shared token
        if (!token && build.personalAccessToken) {
            token = build.personalAccessToken;
            console.log('🔑 Using personal access token');
        }

        // Create GitHub client if token is available
        if (token) {
            githubClient = new GitHubGraphQLClient(token);
        } else {
            console.warn('⚠️ No access token found. GitHub data fetching will be skipped.');
        }
    } catch (error) {
        console.error('❌ Failed to initialize GitHub client:', error);
    }

    const useCase = new FetchBuildDetailsStatsUseCase(
        workflowRunRepo,
        testResultRepo,
        buildRepo,
        githubClient
    );

    console.log('⏱️ Starting measurement...');
    const start = performance.now();

    try {
        const stats = await useCase.execute(build);
        const end = performance.now();

        console.log('\n✅ Stats fetched successfully!');
        console.log(`⏱️ Total Execution Time: ${((end - start) / 1000).toFixed(2)}s`);

        if (stats.mostUpdatedFiles) {
            console.log(`📄 Retrieved ${stats.mostUpdatedFiles.length} updated files.`);
        }
        if (stats.contributors) {
            console.log(`👥 Retrieved ${stats.contributors.length} contributors.`);
        }
        if (stats.monthlyCommits) {
            console.log(`📅 Retrieved monthly commits for ${stats.monthlyCommits.length} months.`);
        }

    } catch (error) {
        console.error('❌ Error executing use case:', error);
    }

    process.exit(0);
}

measurePerformance().catch(console.error);
