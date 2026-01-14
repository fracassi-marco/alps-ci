import type { AccessTokenRepository } from '../domain/AccessTokenRepository';
import type { AccessTokenResponse } from '../domain/models';

/**
 * Use case for listing all Access Tokens for a tenant
 * Only owners and admins can list tokens
 */
export class ListAccessTokensUseCase {
  constructor(private tokenRepository: AccessTokenRepository) {}

  async execute(params: {
    tenantId: string;
    userRole: 'owner' | 'admin' | 'member';
  }): Promise<AccessTokenResponse[]> {
    // Verify user is owner or admin
    if (params.userRole === 'member') {
      throw new Error('Insufficient permissions. Only owners and admins can view tokens.');
    }

    // Fetch and return tokens (without encrypted tokens)
    return await this.tokenRepository.findByTenantId(params.tenantId);
  }
}

