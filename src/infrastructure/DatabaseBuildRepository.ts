import type { Build, Selector } from '../domain/models';
import { db } from './database/client';
import { builds } from './database/schema';
import { eq, and } from 'drizzle-orm';

export interface BuildRepository {
  findAll(tenantId: string): Promise<Build[]>;
  findById(id: string, tenantId: string): Promise<Build | null>;
  create(build: Omit<Build, 'id' | 'createdAt' | 'updatedAt'>, tenantId: string): Promise<Build>;
  update(id: string, updates: Partial<Build>, tenantId: string): Promise<Build>;
  delete(id: string, tenantId: string): Promise<void>;
  countByAccessTokenId(tokenId: string, tenantId: string): Promise<number>;
  findByAccessTokenId(tokenId: string, tenantId: string): Promise<Build[]>;
}

export class DatabaseBuildRepository implements BuildRepository {
  async findAll(tenantId: string): Promise<Build[]> {
    const results = await db
      .select()
      .from(builds)
      .where(eq(builds.tenantId, tenantId));

    return results.map(this.mapToModel);
  }

  async findById(id: string, tenantId: string): Promise<Build | null> {
    const [result] = await db
      .select()
      .from(builds)
      .where(and(
        eq(builds.id, id),
        eq(builds.tenantId, tenantId)
      ))
      .limit(1);

    if (!result) return null;

    return this.mapToModel(result);
  }

  async create(build: Omit<Build, 'id' | 'createdAt' | 'updatedAt'>, tenantId: string): Promise<Build> {
    const [created] = await db
      .insert(builds)
      .values({
        tenantId,
        name: build.name,
        organization: build.organization,
        repository: build.repository,
        selectors: JSON.stringify(build.selectors),
        accessTokenId: build.accessTokenId || null,
        personalAccessToken: build.personalAccessToken || null,
        cacheExpirationMinutes: build.cacheExpirationMinutes,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to create build');
    }

    return this.mapToModel(created);
  }

  async update(id: string, updates: Partial<Build>, tenantId: string): Promise<Build> {
    // Build update object with only provided fields
    const updateData: any = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.organization !== undefined) updateData.organization = updates.organization;
    if (updates.repository !== undefined) updateData.repository = updates.repository;
    if (updates.selectors !== undefined) updateData.selectors = JSON.stringify(updates.selectors);
    if (updates.accessTokenId !== undefined) updateData.accessTokenId = updates.accessTokenId;
    if (updates.personalAccessToken !== undefined) updateData.personalAccessToken = updates.personalAccessToken;
    if (updates.cacheExpirationMinutes !== undefined) updateData.cacheExpirationMinutes = updates.cacheExpirationMinutes;

    // Always update the updatedAt timestamp
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(builds)
      .set(updateData)
      .where(and(
        eq(builds.id, id),
        eq(builds.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      throw new Error(`Build with id "${id}" not found or access denied`);
    }

    return this.mapToModel(updated);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    const result = await db
      .delete(builds)
      .where(and(
        eq(builds.id, id),
        eq(builds.tenantId, tenantId)
      ))
      .returning();

    if (result.length === 0) {
      throw new Error(`Build with id "${id}" not found or access denied`);
    }
  }

  async countByAccessTokenId(tokenId: string, tenantId: string): Promise<number> {
    const results = await db
      .select()
      .from(builds)
      .where(and(
        eq(builds.accessTokenId, tokenId),
        eq(builds.tenantId, tenantId)
      ));

    return results.length;
  }

  async findByAccessTokenId(tokenId: string, tenantId: string): Promise<Build[]> {
    const results = await db
      .select()
      .from(builds)
      .where(and(
        eq(builds.accessTokenId, tokenId),
        eq(builds.tenantId, tenantId)
      ));

    return results.map(this.mapToModel.bind(this));
  }

  private mapToModel(row: any): Build {
    // Parse selectors from JSON string
    let selectors: Selector[] = [];
    try {
      selectors = typeof row.selectors === 'string'
        ? JSON.parse(row.selectors)
        : row.selectors || [];
    } catch (error) {
      console.error('Failed to parse selectors:', error);
      selectors = [];
    }

    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      organization: row.organization,
      repository: row.repository,
      selectors,
      accessTokenId: row.accessTokenId || null,
      personalAccessToken: row.personalAccessToken || null,
      cacheExpirationMinutes: row.cacheExpirationMinutes,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }
}

