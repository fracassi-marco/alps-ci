import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { DeleteAccessTokenUseCase } from '@/use-cases/deleteAccessToken';
import type { AccessTokenRepository } from '@/domain/AccessTokenRepository';
import type { BuildRepository } from '@/infrastructure/DatabaseBuildRepository';
import type { AccessToken, Build } from '@/domain/models';

// Set up encryption key for tests
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a'.repeat(64);

describe('DeleteAccessTokenUseCase', () => {
  let useCase: DeleteAccessTokenUseCase;
  let mockTokenRepository: AccessTokenRepository;
  let mockBuildRepository: BuildRepository;

  const existingToken: AccessToken = {
    id: 'token-123',
    tenantId: 'tenant-1',
    name: 'Test Token',
    encryptedToken: 'encrypted_value',
    createdBy: 'user-1',
    lastUsed: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    mockTokenRepository = {
      findByTenantId: mock(async () => []),
      findById: mock(async () => existingToken),
      create: mock(async () => ({} as AccessToken)),
      update: mock(async () => ({} as AccessToken)),
      delete: mock(async () => {}),
      updateLastUsed: mock(async () => {}),
    };

    mockBuildRepository = {
      findAll: mock(async () => []),
      findById: mock(async () => null),
      create: mock(async () => ({} as Build)),
      update: mock(async () => ({} as Build)),
      delete: mock(async () => {}),
      countByAccessTokenId: mock(async () => 0),
      findByAccessTokenId: mock(async () => []),
    };

    useCase = new DeleteAccessTokenUseCase(mockTokenRepository, mockBuildRepository);
  });

  describe('permissions', () => {
    it('should allow owners to delete tokens', async () => {
      const result = await useCase.execute({
        tokenId: 'token-123',
        tenantId: 'tenant-1',
        userRole: 'owner',
      });

      expect(result.deleted).toBe(true);
      expect(mockTokenRepository.delete).toHaveBeenCalledWith('token-123', 'tenant-1');
    });

    it('should allow admins to delete tokens', async () => {
      const result = await useCase.execute({
        tokenId: 'token-123',
        tenantId: 'tenant-1',
        userRole: 'admin',
      });

      expect(result.deleted).toBe(true);
      expect(mockTokenRepository.delete).toHaveBeenCalledWith('token-123', 'tenant-1');
    });

    it('should deny members from deleting tokens', async () => {
      await expect(
        useCase.execute({
          tokenId: 'token-123',
          tenantId: 'tenant-1',
          userRole: 'member',
        })
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('validation', () => {
    it('should throw error if token does not exist', async () => {
      mockTokenRepository.findById = mock(async () => null);

      await expect(
        useCase.execute({
          tokenId: 'non-existent',
          tenantId: 'tenant-1',
          userRole: 'owner',
        })
      ).rejects.toThrow('Token not found');
    });
  });

  describe('usage check', () => {
    it('should prevent deletion if builds are using the token', async () => {
      const buildsUsingToken: Build[] = [
        {
          id: 'build-1',
          tenantId: 'tenant-1',
          name: 'Production Build',
          organization: 'myorg',
          repository: 'myrepo',
          selectors: [{ type: 'branch', pattern: 'main' }],
          personalAccessToken: 'token-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          accessTokenId: 'ignore',
        },
        {
          id: 'build-2',
          tenantId: 'tenant-1',
          name: 'Staging Build',
          organization: 'myorg',
          repository: 'myrepo',
          selectors: [{ type: 'branch', pattern: 'staging' }],
          personalAccessToken: 'token-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          accessTokenId: 'ignore',
        },
      ];

      mockBuildRepository.findByAccessTokenId = mock(async () => buildsUsingToken);

      const result = await useCase.execute({
        tokenId: 'token-123',
        tenantId: 'tenant-1',
        userRole: 'owner',
      });

      expect(result.deleted).toBe(false);
      expect(result.buildsUsingToken).toEqual(['Production Build', 'Staging Build']);
      expect(mockTokenRepository.delete).not.toHaveBeenCalled();
    });

    it('should allow deletion if no builds are using the token', async () => {
      mockBuildRepository.findByAccessTokenId = mock(async () => []);

      const result = await useCase.execute({
        tokenId: 'token-123',
        tenantId: 'tenant-1',
        userRole: 'owner',
      });

      expect(result.deleted).toBe(true);
      expect(result.buildsUsingToken).toBeUndefined();
      expect(mockTokenRepository.delete).toHaveBeenCalledWith('token-123', 'tenant-1');
    });
  });

  describe('successful deletion', () => {
    it('should delete token when all conditions are met', async () => {
      const result = await useCase.execute({
        tokenId: 'token-123',
        tenantId: 'tenant-1',
        userRole: 'owner',
      });

      expect(result.deleted).toBe(true);
      expect(mockTokenRepository.delete).toHaveBeenCalledWith('token-123', 'tenant-1');
    });

    it('should verify token belongs to tenant before deletion', async () => {
      await useCase.execute({
        tokenId: 'token-123',
        tenantId: 'tenant-1',
        userRole: 'owner',
      });

      expect(mockTokenRepository.findById).toHaveBeenCalledWith('token-123', 'tenant-1');
    });

    it('should check build usage before deletion', async () => {
      await useCase.execute({
        tokenId: 'token-123',
        tenantId: 'tenant-1',
        userRole: 'owner',
      });

      expect(mockBuildRepository.findByAccessTokenId).toHaveBeenCalledWith('token-123', 'tenant-1');
    });
  });
});

