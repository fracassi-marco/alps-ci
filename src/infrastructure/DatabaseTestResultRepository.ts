import { eq, and, desc } from 'drizzle-orm';
import { db } from './database/client';
import { testResults } from './database/schema';
import type { TestResultRecord, TestCase } from '@/domain/models';

export interface TestResultRepository {
  create(result: Omit<TestResultRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestResultRecord>;
  findByWorkflowRunId(workflowRunId: string, tenantId: string): Promise<TestResultRecord | null>;
  findByBuildId(buildId: string, tenantId: string, limit?: number): Promise<TestResultRecord[]>;
}

export class DatabaseTestResultRepository implements TestResultRepository {
  async create(result: Omit<TestResultRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<TestResultRecord> {
    const [created] = await db
      .insert(testResults)
      .values({
        workflowRunId: result.workflowRunId,
        buildId: result.buildId,
        tenantId: result.tenantId,
        totalTests: result.totalTests,
        passedTests: result.passedTests,
        failedTests: result.failedTests,
        skippedTests: result.skippedTests,
        testCases: result.testCases ? JSON.stringify(result.testCases) : null,
        artifactName: result.artifactName,
        artifactUrl: result.artifactUrl,
        parsedAt: result.parsedAt,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create test result');
    }

    return this.mapToModel(created);
  }

  async findByWorkflowRunId(workflowRunId: string, tenantId: string): Promise<TestResultRecord | null> {
    const results = await db
      .select()
      .from(testResults)
      .where(and(eq(testResults.workflowRunId, workflowRunId), eq(testResults.tenantId, tenantId)))
      .limit(1);

    const result = results[0];
    return result ? this.mapToModel(result) : null;
  }

  async findByBuildId(buildId: string, tenantId: string, limit?: number): Promise<TestResultRecord[]> {
    let query = db
      .select()
      .from(testResults)
      .where(and(eq(testResults.buildId, buildId), eq(testResults.tenantId, tenantId)))
      .orderBy(desc(testResults.parsedAt));

    if (limit) {
      query = query.limit(limit) as any;
    }

    const results = await query;
    return results.map(this.mapToModel);
  }

  private mapToModel(row: any): TestResultRecord {
    let testCases: TestCase[] | null = null;
    if (row.testCases) {
      try {
        testCases = typeof row.testCases === 'string' ? JSON.parse(row.testCases) : row.testCases;
      } catch (error) {
        console.error('Failed to parse test cases JSON:', error);
      }
    }

    return {
      id: row.id,
      workflowRunId: row.workflowRunId,
      buildId: row.buildId,
      tenantId: row.tenantId,
      totalTests: row.totalTests,
      passedTests: row.passedTests,
      failedTests: row.failedTests,
      skippedTests: row.skippedTests,
      testCases,
      artifactName: row.artifactName,
      artifactUrl: row.artifactUrl,
      parsedAt: new Date(row.parsedAt),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}
