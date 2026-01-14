import type { AccessTokenRepository } from '../domain/AccessTokenRepository';
import type { AccessToken } from '../domain/models';
import { encrypt } from '../infrastructure/encryption';

/**
 * Use case for creating a new Access Token
 * Only owners and admins can create tokens
 */
export class CreateAccessTokenUseCase {
  constructor(private tokenRepository: AccessTokenRepository) {}

  async execute(params: {
    tenantId: string;
    userId: string;
    userRole: 'owner' | 'admin' | 'member';
    name: string;
    token: string;
  }): Promise<AccessToken> {
    // Verify user is owner or admin
    if (params.userRole === 'member') {
      throw new Error('Insufficient permissions. Only owners and admins can create tokens.');
    }

    // Validate name
    if (!params.name || params.name.trim().length === 0) {
      throw new Error('Token name is required');
    }

    if (params.name.length > 100) {
      throw new Error('Token name must be 100 characters or less');
    }

    // Validate token
    if (!params.token || params.token.trim().length === 0) {
      throw new Error('Token value is required');
    }

    // Check if name already exists for this tenant
    const existingTokens = await this.tokenRepository.findByTenantId(params.tenantId);
    const duplicateName = existingTokens.find(
      (t) => t.name.toLowerCase() === params.name.trim().toLowerCase()
    );

    if (duplicateName) {
      throw new Error('A token with this name already exists');
    }

    // Encrypt the token
    const encryptedToken = encrypt(params.token);

    // Create the token
    const newToken = await this.tokenRepository.create({
      tenantId: params.tenantId,
      name: params.name.trim(),
      encryptedToken,
      createdBy: params.userId,
    });

    return newToken;
  }
}

