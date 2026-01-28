import { eq, and, desc, gt, gte, lte } from 'drizzle-orm';
import { db } from './database/client';
import { workflowRuns } from './database/schema';
import type { WorkflowRunRecord } from '@/domain/models';

export interface WorkflowRunRepository {
  create(run: Omit<WorkflowRunRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkflowRunRecord>;
  bulkCreate(runs: Omit<WorkflowRunRecord, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<WorkflowRunRecord[]>;
  findByBuildId(buildId: string, tenantId: string, limit?: number): Promise<WorkflowRunRecord[]>;
  findByBuildIdSince(buildId: string, tenantId: string, since: Date): Promise<WorkflowRunRecord[]>;
  findByBuildIdInDateRange(buildId: string, tenantId: string, startDate: Date, endDate: Date): Promise<WorkflowRunRecord[]>;
  findByGithubRunId(buildId: string, githubRunId: number, tenantId: string): Promise<WorkflowRunRecord | null>;
  getLastSyncedRun(buildId: string, tenantId: string): Promise<WorkflowRunRecord | null>;
}

export class DatabaseWorkflowRunRepository implements WorkflowRunRepository {
  async create(run: Omit<WorkflowRunRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkflowRunRecord> {
    const [created] = await db
      .insert(workflowRuns)
      .values({
        buildId: run.buildId,
        tenantId: run.tenantId,
        githubRunId: run.githubRunId,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        htmlUrl: run.htmlUrl,
        headBranch: run.headBranch,
        event: run.event,
        duration: run.duration,
        commitSha: run.commitSha,
        commitMessage: run.commitMessage,
        commitAuthor: run.commitAuthor,
        commitDate: run.commitDate,
        workflowCreatedAt: run.workflowCreatedAt,
        workflowUpdatedAt: run.workflowUpdatedAt,
        syncedAt: run.syncedAt,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create workflow run');
    }

    return this.mapToModel(created);
  }

  async bulkCreate(runs: Omit<WorkflowRunRecord, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<WorkflowRunRecord[]> {
    if (runs.length === 0) {
      return [];
    }

    const values = runs.map((run) => ({
      buildId: run.buildId,
      tenantId: run.tenantId,
      githubRunId: run.githubRunId,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      htmlUrl: run.htmlUrl,
      headBranch: run.headBranch,
      event: run.event,
      duration: run.duration,
      commitSha: run.commitSha,
      commitMessage: run.commitMessage,
      commitAuthor: run.commitAuthor,
      commitDate: run.commitDate,
      workflowCreatedAt: run.workflowCreatedAt,
      workflowUpdatedAt: run.workflowUpdatedAt,
      syncedAt: run.syncedAt,
    }));

    const created = await db
      .insert(workflowRuns)
      .values(values)
      .returning();

    return created.map(this.mapToModel);
  }

  async findByBuildId(buildId: string, tenantId: string, limit?: number): Promise<WorkflowRunRecord[]> {
    let query = db
      .select()
      .from(workflowRuns)
      .where(and(eq(workflowRuns.buildId, buildId), eq(workflowRuns.tenantId, tenantId)))
      .orderBy(desc(workflowRuns.workflowCreatedAt));

    if (limit) {
      query = query.limit(limit) as any;
    }

    const results = await query;
    return results.map(this.mapToModel);
  }

  async findByBuildIdSince(buildId: string, tenantId: string, since: Date): Promise<WorkflowRunRecord[]> {
    const results = await db
      .select()
      .from(workflowRuns)
      .where(
        and(
          eq(workflowRuns.buildId, buildId),
          eq(workflowRuns.tenantId, tenantId),
          gt(workflowRuns.workflowCreatedAt, since)
        )
      )
      .orderBy(desc(workflowRuns.workflowCreatedAt));

    return results.map(this.mapToModel);
  }

  async findByBuildIdInDateRange(
    buildId: string,
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<WorkflowRunRecord[]> {
    const results = await db
      .select()
      .from(workflowRuns)
      .where(
        and(
          eq(workflowRuns.buildId, buildId),
          eq(workflowRuns.tenantId, tenantId),
          gte(workflowRuns.workflowCreatedAt, startDate),
          lte(workflowRuns.workflowCreatedAt, endDate)
        )
      )
      .orderBy(desc(workflowRuns.workflowCreatedAt));

    return results.map(this.mapToModel);
  }

  async findByGithubRunId(
    buildId: string,
    githubRunId: number,
    tenantId: string
  ): Promise<WorkflowRunRecord | null> {
    const results = await db
      .select()
      .from(workflowRuns)
      .where(
        and(
          eq(workflowRuns.buildId, buildId),
          eq(workflowRuns.githubRunId, githubRunId),
          eq(workflowRuns.tenantId, tenantId)
        )
      )
      .limit(1);

    const result = results[0];
    return result ? this.mapToModel(result) : null;
  }

  async getLastSyncedRun(buildId: string, tenantId: string): Promise<WorkflowRunRecord | null> {
    const results = await db
      .select()
      .from(workflowRuns)
      .where(and(eq(workflowRuns.buildId, buildId), eq(workflowRuns.tenantId, tenantId)))
      .orderBy(desc(workflowRuns.workflowCreatedAt))
      .limit(1);

    const result = results[0];
    return result ? this.mapToModel(result) : null;
  }

  private mapToModel(row: any): WorkflowRunRecord {
    return {
      id: row.id,
      buildId: row.buildId,
      tenantId: row.tenantId,
      githubRunId: row.githubRunId,
      name: row.name,
      status: row.status,
      conclusion: row.conclusion,
      htmlUrl: row.htmlUrl,
      headBranch: row.headBranch,
      event: row.event,
      duration: row.duration,
      commitSha: row.commitSha,
      commitMessage: row.commitMessage,
      commitAuthor: row.commitAuthor,
      commitDate: row.commitDate,
      workflowCreatedAt: new Date(row.workflowCreatedAt),
      workflowUpdatedAt: new Date(row.workflowUpdatedAt),
      syncedAt: new Date(row.syncedAt),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}
