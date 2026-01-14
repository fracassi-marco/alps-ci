import type { AccessToken, AccessTokenResponse } from './models';

/**
 * Repository interface for Access Token persistence
 */
export interface AccessTokenRepository {
  /**
   * Find all tokens for a tenant (with creator names)
   */
  findByTenantId(tenantId: string): Promise<AccessTokenResponse[]>;

  /**
   * Find a single token by ID (must belong to tenant for security)
   */
  findById(id: string, tenantId: string): Promise<AccessToken | null>;

  /**
   * Create a new token
   */
  create(token: Omit<AccessToken, 'id' | 'createdAt' | 'updatedAt' | 'lastUsed'>): Promise<AccessToken>;

  /**
   * Update token name and/or encrypted token
   */
  update(
    id: string,
    tenantId: string,
    updates: Partial<Pick<AccessToken, 'name' | 'encryptedToken'>>
  ): Promise<AccessToken>;

  /**
   * Delete a token
   */
  delete(id: string, tenantId: string): Promise<void>;

  /**
   * Update last used timestamp
   */
  updateLastUsed(id: string): Promise<void>;
}


