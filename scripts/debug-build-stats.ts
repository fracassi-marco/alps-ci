#!/usr/bin/env bun

/**
 * Debug script to check build stats discrepancies
 * Usage: bun scripts/debug-build-stats.ts <organization> <repository>
 */

import { db } from '@/infrastructure/database/client';
import { builds, workflowRuns } from '@/infrastructure/database/schema';
import { eq, and, gte } from 'drizzle-orm';

const organization = process.argv[2];
const repository = process.argv[3];

if (!organization || !repository) {
  console.error('Usage: bun scripts/debug-build-stats.ts <organization> <repository>');
  console.error('Example: bun scripts/debug-build-stats.ts fracassi-marco alps-ci');
  process.exit(1);
}

async function debugBuildStats() {
  console.log(`\n🔍 Debugging build stats for ${organization}/${repository}\n`);

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

  const build = buildResults[0]!;
  console.log(`✅ Found build: ${build.name} (ID: ${build.id})`);
  console.log(`   Selectors: ${JSON.stringify(build.selectors, null, 2)}`);
  console.log(`   Last analyzed commit: ${build.lastAnalyzedCommitSha || 'none'}\n`);

  // Get workflow runs from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const allRuns = await db
    .select()
    .from(workflowRuns)
    .where(and(
      eq(workflowRuns.buildId, build.id),
      gte(workflowRuns.workflowCreatedAt, sevenDaysAgo)
    ))
    .orderBy(workflowRuns.workflowCreatedAt);

  console.log(`📊 Total workflow runs in last 7 days: ${allRuns.length}\n`);

  // Group by status
  const byStatus: Record<string, any[]> = {};
  const byDate: Record<string, { success: number; failure: number; other: number }> = {};

  for (const run of allRuns) {
    if (!byStatus[run.status]) {
      byStatus[run.status] = [];
    }
    byStatus[run.status]!.push(run);

    // Group by date
    const dateStr = run.workflowCreatedAt.toISOString().split('T')[0]!;
    if (!byDate[dateStr]) {
      byDate[dateStr] = { success: 0, failure: 0, other: 0 };
    }
    
    if (run.status === 'success') {
      byDate[dateStr]!.success++;
    } else if (run.status === 'failure') {
      byDate[dateStr]!.failure++;
    } else {
      byDate[dateStr]!.other++;
    }
  }

  // Print summary by status
  console.log('📈 Breakdown by status:');
  for (const [status, runs] of Object.entries(byStatus)) {
    console.log(`   ${status}: ${runs.length}`);
  }

  console.log('\n📅 Breakdown by date:');
  const sortedDates = Object.keys(byDate).sort();
  for (const date of sortedDates) {
    const stats = byDate[date]!;
    console.log(`   ${date}: ✅ ${stats.success} success, ❌ ${stats.failure} failure, ⚪ ${stats.other} other`);
  }

  // Print today's runs in detail
  const today = new Date().toISOString().split('T')[0]!;
  const todayRuns = allRuns.filter(run => run.workflowCreatedAt.toISOString().split('T')[0] === today);
  
  if (todayRuns.length > 0) {
    console.log(`\n🔍 Today's runs (${today}):`);
    for (const run of todayRuns) {
      const time = run.workflowCreatedAt.toISOString().split('T')[1]!.substring(0, 8);
      const emoji = run.status === 'success' ? '✅' : run.status === 'failure' ? '❌' : '⚪';
      console.log(`   ${emoji} ${time} | ${run.name} | ${run.status} | ${run.conclusion || 'N/A'} | Branch: ${run.headBranch || 'N/A'}`);
      console.log(`      URL: ${run.htmlUrl}`);
    }
  }

  // Check all runs (not just last 7 days) for debugging
  const allRunsEver = await db
    .select()
    .from(workflowRuns)
    .where(eq(workflowRuns.buildId, build.id));

  console.log(`\n📦 Total workflow runs in database (all time): ${allRunsEver.length}`);

  // Print last 10 runs for context
  console.log(`\n🕒 Last 10 runs (sorted by creation date DESC):`);
  const last10 = allRunsEver
    .sort((a, b) => b.workflowCreatedAt.getTime() - a.workflowCreatedAt.getTime())
    .slice(0, 10);

  for (const run of last10) {
    const date = run.workflowCreatedAt.toISOString().split('T')[0];
    const time = run.workflowCreatedAt.toISOString().split('T')[1]!.substring(0, 8);
    const emoji = run.status === 'success' ? '✅' : run.status === 'failure' ? '❌' : '⚪';
    console.log(`   ${emoji} ${date} ${time} | ${run.name} | ${run.status} | Branch: ${run.headBranch || 'N/A'}`);
  }

  console.log('\n✨ Debug complete!\n');
}

debugBuildStats().catch(console.error);
