import { eq, and } from 'drizzle-orm';
import { accessTokens, users } from './database/schema';
import type {
  AccessToken,
  AccessTokenResponse,
} from '../domain/models';
import type { AccessTokenRepository } from '../domain/AccessTokenRepository';
import { db } from './database/client';

export class DatabaseAccessTokenRepository implements AccessTokenRepository {
  /**
   * Find all tokens for a tenant with creator names
   */
  async findByTenantId(tenantId: string): Promise<AccessTokenResponse[]> {
    const results = await db
      .select({
        id: accessTokens.id,
        tenantId: accessTokens.tenantId,
        name: accessTokens.name,
        createdBy: accessTokens.createdBy,
        createdByName: users.name,
        lastUsed: accessTokens.lastUsed,
        createdAt: accessTokens.createdAt,
        updatedAt: accessTokens.updatedAt,
      })
      .from(accessTokens)
      .leftJoin(users, eq(accessTokens.createdBy, users.id))
      .where(eq(accessTokens.tenantId, tenantId))
      .orderBy(accessTokens.name);

    return results.map((row: any) => ({
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      createdBy: row.createdBy,
      createdByName: row.createdByName || undefined,
      lastUsed: row.lastUsed,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  /**
   * Find a single token by ID (with tenant check for security)
   */
  async findById(id: string, tenantId: string): Promise<AccessToken | null> {
    const results = await db
      .select()
      .from(accessTokens)
      .where(and(eq(accessTokens.id, id), eq(accessTokens.tenantId, tenantId)))
      .limit(1);

    if (results.length === 0) {
      return null;
    }

    return results[0]!;
  }

  /**
   * Create a new token
   */
  async create(
    token: Omit<AccessToken, 'id' | 'createdAt' | 'updatedAt' | 'lastUsed'>
  ): Promise<AccessToken> {
    const now = new Date();
    const newToken: AccessToken = {
      id: crypto.randomUUID(),
      ...token,
      lastUsed: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(accessTokens).values(newToken);

    return newToken;
  }

  /**
   * Update token name and/or encrypted token
   */
  async update(
    id: string,
    tenantId: string,
    updates: Partial<Pick<AccessToken, 'name' | 'encryptedToken'>>
  ): Promise<AccessToken> {
    const now = new Date();
    await db
      .update(accessTokens)
      .set({
        ...updates,
        updatedAt: now,
      })
      .where(and(eq(accessTokens.id, id), eq(accessTokens.tenantId, tenantId)));

    const updated = await this.findById(id, tenantId);
    if (!updated) {
      throw new Error('Token not found after update');
    }

    return updated;
  }

  /**
   * Delete a token
   */
  async delete(id: string, tenantId: string): Promise<void> {
    await db
      .delete(accessTokens)
      .where(and(eq(accessTokens.id, id), eq(accessTokens.tenantId, tenantId)));
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(id: string): Promise<void> {
    await db
      .update(accessTokens)
      .set({ lastUsed: new Date() })
      .where(eq(accessTokens.id, id));
  }
}

