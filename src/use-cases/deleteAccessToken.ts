import type { AccessTokenRepository } from '../domain/AccessTokenRepository';
import type { BuildRepository } from '../infrastructure/DatabaseBuildRepository';

/**
 * Use case for deleting an Access Token
 * Only owners and admins can delete tokens
 * Prevents deletion if builds are using the token
 */
export class DeleteAccessTokenUseCase {
  constructor(
    private tokenRepository: AccessTokenRepository,
    private buildRepository: BuildRepository
  ) {}

  async execute(params: {
    tokenId: string;
    tenantId: string;
    userRole: 'owner' | 'admin' | 'member';
  }): Promise<{ deleted: boolean; buildsUsingToken?: string[] }> {
    // Verify user is owner or admin
    if (params.userRole === 'member') {
      throw new Error('Insufficient permissions. Only owners and admins can delete tokens.');
    }

    // Verify token exists and belongs to tenant
    const existingToken = await this.tokenRepository.findById(params.tokenId, params.tenantId);
    if (!existingToken) {
      throw new Error('Token not found');
    }

    // Check if any builds are using this token
    const buildsUsingToken = await this.buildRepository.findByAccessTokenId(
      params.tokenId,
      params.tenantId
    );

    if (buildsUsingToken.length > 0) {
      // Return information about builds using the token
      return {
        deleted: false,
        buildsUsingToken: buildsUsingToken.map(build => build.name),
      };
    }

    // Delete the token
    await this.tokenRepository.delete(params.tokenId, params.tenantId);

    return { deleted: true };
  }
}

