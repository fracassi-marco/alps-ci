import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { CreateAccessTokenUseCase } from '@/use-cases/createAccessToken';
import type { AccessTokenRepository } from '@/domain/AccessTokenRepository';
import type { AccessToken, AccessTokenResponse } from '@/domain/models';

// Set up encryption key for tests
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a'.repeat(64);

describe('CreateAccessTokenUseCase', () => {
  let useCase: CreateAccessTokenUseCase;
  let mockRepository: AccessTokenRepository;

  beforeEach(() => {

    mockRepository = {
      findByTenantId: mock(async () => [] as AccessTokenResponse[]),
      findById: mock(async () => null),
      create: mock(async (data: any) => ({
        id: 'token-123',
        ...data,
        lastUsed: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }) as AccessToken),
      update: mock(async () => ({} as AccessToken)),
      delete: mock(async () => {}),
      updateLastUsed: mock(async () => {}),
    };

    useCase = new CreateAccessTokenUseCase(mockRepository);
  });

  describe('permissions', () => {
    it('should allow owners to create tokens', async () => {
      const result = await useCase.execute({
        tenantId: 'tenant-1',
        userId: 'user-1',
        userRole: 'owner',
        name: 'Production Token',
        token: 'ghp_abc123',
      });

      expect(result.id).toBe('token-123');
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should allow admins to create tokens', async () => {
      const result = await useCase.execute({
        tenantId: 'tenant-1',
        userId: 'user-1',
        userRole: 'admin',
        name: 'Production Token',
        token: 'ghp_abc123',
      });

      expect(result.id).toBe('token-123');
      expect(mockRepository.create).toHaveBeenCalled();
    });

    it('should deny members from creating tokens', async () => {
      await expect(
        useCase.execute({
          tenantId: 'tenant-1',
          userId: 'user-1',
          userRole: 'member',
          name: 'Production Token',
          token: 'ghp_abc123',
        })
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('validation', () => {
    it('should require a name', async () => {
      await expect(
        useCase.execute({
          tenantId: 'tenant-1',
          userId: 'user-1',
          userRole: 'owner',
          name: '',
          token: 'ghp_abc123',
        })
      ).rejects.toThrow('Token name is required');
    });

    it('should trim and validate name', async () => {
      await expect(
        useCase.execute({
          tenantId: 'tenant-1',
          userId: 'user-1',
          userRole: 'owner',
          name: '   ',
          token: 'ghp_abc123',
        })
      ).rejects.toThrow('Token name is required');
    });

    it('should enforce name length limit', async () => {
      const longName = 'a'.repeat(101);
      await expect(
        useCase.execute({
          tenantId: 'tenant-1',
          userId: 'user-1',
          userRole: 'owner',
          name: longName,
          token: 'ghp_abc123',
        })
      ).rejects.toThrow('Token name must be 100 characters or less');
    });

    it('should require a token', async () => {
      await expect(
        useCase.execute({
          tenantId: 'tenant-1',
          userId: 'user-1',
          userRole: 'owner',
          name: 'Production Token',
          token: '',
        })
      ).rejects.toThrow('Token value is required');
    });

    it('should reject duplicate names (case insensitive)', async () => {
      mockRepository.findByTenantId = mock(async () => [
        {
          id: 'existing-token',
          tenantId: 'tenant-1',
          name: 'Production Token',
          createdBy: 'user-2',
          lastUsed: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as AccessTokenResponse[]);

      await expect(
        useCase.execute({
          tenantId: 'tenant-1',
          userId: 'user-1',
          userRole: 'owner',
          name: 'production token',
          token: 'ghp_abc123',
        })
      ).rejects.toThrow('A token with this name already exists');
    });
  });

  describe('token creation', () => {
    it('should encrypt token before saving', async () => {
      await useCase.execute({
        tenantId: 'tenant-1',
        userId: 'user-1',
        userRole: 'owner',
        name: 'Production Token',
        token: 'ghp_abc123',
      });

      const createCall = (mockRepository.create as any).mock.calls[0][0];

      expect(createCall.tenantId).toBe('tenant-1');
      expect(createCall.name).toBe('Production Token');
      expect(createCall.createdBy).toBe('user-1');
      // Verify token is encrypted (should be different from plain text and contain colons for AES-GCM format)
      expect(createCall.encryptedToken).not.toBe('ghp_abc123');
      expect(createCall.encryptedToken).toContain(':'); // AES-GCM format: iv:data:tag
    });

    it('should trim token name', async () => {
      await useCase.execute({
        tenantId: 'tenant-1',
        userId: 'user-1',
        userRole: 'owner',
        name: '  Production Token  ',
        token: 'ghp_abc123',
      });

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Production Token',
        })
      );
    });

    it('should return created token', async () => {
      const result = await useCase.execute({
        tenantId: 'tenant-1',
        userId: 'user-1',
        userRole: 'owner',
        name: 'Production Token',
        token: 'ghp_abc123',
      });

      expect(result).toMatchObject({
        id: 'token-123',
        tenantId: 'tenant-1',
        name: 'Production Token',
        createdBy: 'user-1',
      });
    });
  });
});

