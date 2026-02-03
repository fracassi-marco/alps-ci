#!/usr/bin/env bun

/**
 * Manual sync script to force sync a build's workflow runs
 * Usage: bun scripts/manual-sync.ts <organization> <repository>
 */

import { DatabaseBuildRepository } from '@/infrastructure/DatabaseBuildRepository';
import { DatabaseWorkflowRunRepository } from '@/infrastructure/DatabaseWorkflowRunRepository';
import { DatabaseTestResultRepository } from '@/infrastructure/DatabaseTestResultRepository';
import { DatabaseBuildSyncStatusRepository } from '@/infrastructure/DatabaseBuildSyncStatusRepository';
import { DatabaseAccessTokenRepository } from '@/infrastructure/DatabaseAccessTokenRepository';
import { GitHubGraphQLClient } from '@/infrastructure/GitHubGraphQLClient';
import { TokenResolutionService } from '@/infrastructure/TokenResolutionService';
import { SyncBuildHistoryUseCase } from '@/use-cases/syncBuildHistory';
import { db } from '@/infrastructure/database/client';
import { builds } from '@/infrastructure/database/schema';
import { eq, and } from 'drizzle-orm';

const organization = process.argv[2];
const repository = process.argv[3];

if (!organization || !repository) {
  console.error('Usage: bun scripts/manual-sync.ts <organization> <repository>');
  console.error('Example: bun scripts/manual-sync.ts fracassi-marco alps-ci');
  process.exit(1);
}

async function manualSync() {
  console.log(`\n🔄 Manual sync for ${organization}/${repository}\n`);

  // Find the build
  const buildResults = await db
    .select()
    .from(builds)
    .where(and(
      eq(builds.organization, organization!),
      eq(builds.repository, repository!)
    ));

  if (buildResults.length === 0) {
    console.error(`❌ No build found for ${organization}/${repository}`);
    process.exit(1);
  }

  const buildRow = buildResults[0]!;
  console.log(`✅ Found build: ${buildRow.name} (ID: ${buildRow.id})`);

  // Convert to domain model
  const build = {
    id: buildRow.id,
    tenantId: buildRow.tenantId,
    name: buildRow.name,
    organization: buildRow.organization,
    repository: buildRow.repository,
    personalAccessToken: buildRow.personalAccessToken,
    accessTokenId: buildRow.accessTokenId,
    selectors: typeof buildRow.selectors === 'string' 
      ? JSON.parse(buildRow.selectors) 
      : buildRow.selectors,
    lastAnalyzedCommitSha: buildRow.lastAnalyzedCommitSha,
    createdAt: new Date(buildRow.createdAt),
    updatedAt: new Date(buildRow.updatedAt),
  };

  // Resolve token
  const accessTokenRepository = new DatabaseAccessTokenRepository();
  const tokenResolutionService = new TokenResolutionService(accessTokenRepository);
  const githubToken = await tokenResolutionService.resolveToken({
    accessTokenId: build.accessTokenId,
    inlineToken: build.personalAccessToken,
    tenantId: build.tenantId,
  });

  console.log(`🔑 Token resolved\n`);

  // Create repositories and client
  const githubClient = new GitHubGraphQLClient(githubToken);
  const workflowRunRepository = new DatabaseWorkflowRunRepository();
  const testResultRepository = new DatabaseTestResultRepository();
  const syncStatusRepository = new DatabaseBuildSyncStatusRepository();

  // Sync
  console.log(`🔄 Starting sync...\n`);
  const syncUseCase = new SyncBuildHistoryUseCase(
    githubClient,
    workflowRunRepository,
    testResultRepository,
    syncStatusRepository
  );

  const result = await syncUseCase.execute(build);

  console.log(`\n✅ Sync complete!`);
  console.log(`   Runs synced: ${result.newRunsSynced}`);
  console.log(`   Test results parsed: ${result.testResultsParsed}`);
  console.log(`   Last synced at: ${result.lastSyncedAt.toISOString()}\n`);
}

manualSync().catch((error) => {
  console.error('❌ Sync failed:', error);
  process.exit(1);
});
