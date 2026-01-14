import type { AccessTokenRepository } from '../domain/AccessTokenRepository';
import type { AccessToken } from '../domain/models';
import { encrypt } from '../infrastructure/encryption';

/**
 * Use case for updating an Access Token
 * Only owners and admins can update tokens
 */
export class UpdateAccessTokenUseCase {
  constructor(private tokenRepository: AccessTokenRepository) {}

  async execute(params: {
    tokenId: string;
    tenantId: string;
    userId: string;
    userRole: 'owner' | 'admin' | 'member';
    name?: string;
    token?: string;
  }): Promise<AccessToken> {
    // Verify user is owner or admin
    if (params.userRole === 'member') {
      throw new Error('Insufficient permissions. Only owners and admins can update tokens.');
    }

    // Normalize empty strings to undefined
    const name = params.name?.trim() || undefined;
    const token = params.token?.trim() || undefined;

    // At least one field must be provided
    if (!name && !token) {
      throw new Error('At least one field (name or token) must be provided for update');
    }

    // Verify token exists and belongs to tenant
    const existingToken = await this.tokenRepository.findById(params.tokenId, params.tenantId);
    if (!existingToken) {
      throw new Error('Token not found');
    }

    const updates: Partial<Pick<AccessToken, 'name' | 'encryptedToken'>> = {};

    // Validate and prepare name update
    if (name !== undefined) {
      if (name.length === 0) {
        throw new Error('Token name cannot be empty');
      }

      if (name.length > 100) {
        throw new Error('Token name must be 100 characters or less');
      }

      // Check if name already exists for another token in this tenant
      if (name.toLowerCase() !== existingToken.name.toLowerCase()) {
        const existingTokens = await this.tokenRepository.findByTenantId(params.tenantId);
        const duplicateName = existingTokens.find(
          (t) => t.id !== params.tokenId && t.name.toLowerCase() === name.toLowerCase()
        );

        if (duplicateName) {
          throw new Error('A token with this name already exists');
        }
      }

      updates.name = name;
    }

    // Validate and prepare token update
    if (token !== undefined) {
      if (token.length === 0) {
        throw new Error('Token value cannot be empty');
      }

      // Encrypt the new token
      updates.encryptedToken = encrypt(token);
    }

    // Update the token
    const updatedToken = await this.tokenRepository.update(
      params.tokenId,
      params.tenantId,
      updates
    );

    return updatedToken;
  }
}

