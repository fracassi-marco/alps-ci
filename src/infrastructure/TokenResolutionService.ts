import type { AccessTokenRepository } from '../domain/AccessTokenRepository';
import { decrypt } from './encryption';

/**
 * Service for resolving GitHub access tokens
 * Handles both saved access tokens (via accessTokenId) and inline tokens
 */
export class TokenResolutionService {
  constructor(private accessTokenRepository: AccessTokenRepository) {}

  /**
   * Resolves a GitHub access token for API calls
   *
   * @param accessTokenId - Optional ID of saved access token
   * @param inlineToken - Optional inline token
   * @param tenantId - Tenant ID for validation
   * @returns Decrypted GitHub access token
   */
  async resolveToken(params: {
    accessTokenId?: string | null;
    inlineToken?: string | null;
    tenantId: string;
  }): Promise<string> {
    const { accessTokenId, inlineToken, tenantId } = params;

    // Validate: Must have either accessTokenId OR inlineToken (not both, not neither)
    if (!accessTokenId && !inlineToken) {
      throw new Error('Either accessTokenId or inline token must be provided');
    }

    if (accessTokenId && inlineToken) {
      throw new Error('Cannot specify both accessTokenId and inline token');
    }

    // If using saved access token
    if (accessTokenId) {
      const accessToken = await this.accessTokenRepository.findById(accessTokenId, tenantId);

      if (!accessToken) {
        throw new Error('Access token not found');
      }

      // Decrypt the token
      const decryptedToken = decrypt(accessToken.encryptedToken);

      // Update last used timestamp (fire and forget)
      this.accessTokenRepository.updateLastUsed(accessTokenId).catch(err => {
        console.error('Failed to update access token lastUsed:', err);
      });

      return decryptedToken;
    }

    // Use inline token
    return inlineToken!;
  }
}

