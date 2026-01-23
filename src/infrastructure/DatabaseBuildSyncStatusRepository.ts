import { eq, and } from 'drizzle-orm';
import { db } from './database/client';
import { buildSyncStatus } from './database/schema';
import type { BuildSyncStatus } from '@/domain/models';

export interface BuildSyncStatusRepository {
  findByBuildId(buildId: string, tenantId: string): Promise<BuildSyncStatus | null>;
  upsert(status: Partial<BuildSyncStatus> & { buildId: string; tenantId: string }): Promise<BuildSyncStatus>;
  updateLastSync(
    buildId: string,
    tenantId: string,
    lastSyncedAt: Date,
    runId: number,
    runCreatedAt: Date
  ): Promise<void>;
  markBackfillComplete(buildId: string, tenantId: string): Promise<void>;
}

export class DatabaseBuildSyncStatusRepository implements BuildSyncStatusRepository {
  async findByBuildId(buildId: string, tenantId: string): Promise<BuildSyncStatus | null> {
    const results = await db
      .select()
      .from(buildSyncStatus)
      .where(and(eq(buildSyncStatus.buildId, buildId), eq(buildSyncStatus.tenantId, tenantId)))
      .limit(1);

    const result = results[0];
    return result ? this.mapToModel(result) : null;
  }

  async upsert(
    status: Partial<BuildSyncStatus> & { buildId: string; tenantId: string }
  ): Promise<BuildSyncStatus> {
    // Check if record exists
    const existing = await this.findByBuildId(status.buildId, status.tenantId);

    if (existing) {
      // Update existing record
      const [updated] = await db
        .update(buildSyncStatus)
        .set({
          lastSyncedAt: status.lastSyncedAt ?? existing.lastSyncedAt,
          lastSyncedRunId: status.lastSyncedRunId ?? existing.lastSyncedRunId,
          lastSyncedRunCreatedAt: status.lastSyncedRunCreatedAt ?? existing.lastSyncedRunCreatedAt,
          initialBackfillCompleted: status.initialBackfillCompleted ?? existing.initialBackfillCompleted,
          initialBackfillCompletedAt: status.initialBackfillCompletedAt ?? existing.initialBackfillCompletedAt,
          totalRunsSynced: status.totalRunsSynced ?? existing.totalRunsSynced,
          lastSyncError: status.lastSyncError ?? existing.lastSyncError,
          updatedAt: new Date(),
        })
        .where(and(eq(buildSyncStatus.buildId, status.buildId), eq(buildSyncStatus.tenantId, status.tenantId)))
        .returning();

      if (!updated) {
        throw new Error('Failed to update build sync status');
      }

      return this.mapToModel(updated);
    } else {
      // Create new record
      const [created] = await db
        .insert(buildSyncStatus)
        .values({
          buildId: status.buildId,
          tenantId: status.tenantId,
          lastSyncedAt: status.lastSyncedAt ?? null,
          lastSyncedRunId: status.lastSyncedRunId ?? null,
          lastSyncedRunCreatedAt: status.lastSyncedRunCreatedAt ?? null,
          initialBackfillCompleted: status.initialBackfillCompleted ?? false,
          initialBackfillCompletedAt: status.initialBackfillCompletedAt ?? null,
          totalRunsSynced: status.totalRunsSynced ?? 0,
          lastSyncError: status.lastSyncError ?? null,
        })
        .returning();

      if (!created) {
        throw new Error('Failed to create build sync status');
      }

      return this.mapToModel(created);
    }
  }

  async updateLastSync(
    buildId: string,
    tenantId: string,
    lastSyncedAt: Date,
    runId: number,
    runCreatedAt: Date
  ): Promise<void> {
    // Get existing total runs synced
    const existing = await this.findByBuildId(buildId, tenantId);
    const totalRunsSynced = (existing?.totalRunsSynced ?? 0) + 1;

    await db
      .update(buildSyncStatus)
      .set({
        lastSyncedAt,
        lastSyncedRunId: runId,
        lastSyncedRunCreatedAt: runCreatedAt,
        totalRunsSynced,
        lastSyncError: null,
        updatedAt: new Date(),
      })
      .where(and(eq(buildSyncStatus.buildId, buildId), eq(buildSyncStatus.tenantId, tenantId)));
  }

  async markBackfillComplete(buildId: string, tenantId: string): Promise<void> {
    await db
      .update(buildSyncStatus)
      .set({
        initialBackfillCompleted: true,
        initialBackfillCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(buildSyncStatus.buildId, buildId), eq(buildSyncStatus.tenantId, tenantId)));
  }

  private mapToModel(row: any): BuildSyncStatus {
    return {
      id: row.id,
      buildId: row.buildId,
      tenantId: row.tenantId,
      lastSyncedAt: row.lastSyncedAt ? new Date(row.lastSyncedAt) : null,
      lastSyncedRunId: row.lastSyncedRunId,
      lastSyncedRunCreatedAt: row.lastSyncedRunCreatedAt ? new Date(row.lastSyncedRunCreatedAt) : null,
      initialBackfillCompleted: Boolean(row.initialBackfillCompleted),
      initialBackfillCompletedAt: row.initialBackfillCompletedAt ? new Date(row.initialBackfillCompletedAt) : null,
      totalRunsSynced: row.totalRunsSynced,
      lastSyncError: row.lastSyncError,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}
