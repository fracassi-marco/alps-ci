import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { UpdateAccessTokenUseCase } from '@/use-cases/updateAccessToken';
import type { AccessTokenRepository } from '@/domain/AccessTokenRepository';
import type { AccessToken, AccessTokenResponse } from '@/domain/models';

// Set up encryption key for tests
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a'.repeat(64);

describe('UpdateAccessTokenUseCase', () => {
  let useCase: UpdateAccessTokenUseCase;
  let mockRepository: AccessTokenRepository;

  const existingToken: AccessToken = {
    id: 'token-123',
    tenantId: 'tenant-1',
    name: 'Old Token Name',
    encryptedToken: 'encrypted_old_token',
    createdBy: 'user-1',
    lastUsed: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    mockRepository = {
      findByTenantId: mock(async () => [
        {
          id: 'token-123',
          tenantId: 'tenant-1',
          name: 'Old Token Name',
          createdBy: 'user-1',
          lastUsed: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ] as AccessTokenResponse[]),
      findById: mock(async () => existingToken),
      create: mock(async () => ({} as AccessToken)),
      update: mock(async (id, tenantId, updates) => ({
        ...existingToken,
        ...updates,
        updatedAt: new Date(),
      }) as AccessToken),
      delete: mock(async () => {}),
      updateLastUsed: mock(async () => {}),
    };

    useCase = new UpdateAccessTokenUseCase(mockRepository);
  });

  describe('permissions', () => {
    it('should allow owners to update tokens', async () => {
      const result = await useCase.execute({
        tokenId: 'token-123',
        tenantId: 'tenant-1',
        userId: 'user-1',
        userRole: 'owner',
        name: 'New Token Name',
      });

      expect(result.name).toBe('New Token Name');
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should allow admins to update tokens', async () => {
      const result = await useCase.execute({
        tokenId: 'token-123',
        tenantId: 'tenant-1',
        userId: 'user-1',
        userRole: 'admin',
        name: 'New Token Name',
      });

      expect(result.name).toBe('New Token Name');
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should deny members from updating tokens', async () => {
      await expect(
        useCase.execute({
          tokenId: 'token-123',
          tenantId: 'tenant-1',
          userId: 'user-1',
          userRole: 'member',
          name: 'New Token Name',
        })
      ).rejects.toThrow('Insufficient permissions');
    });
  });

  describe('validation', () => {
    it('should require at least one field to update', async () => {
      await expect(
        useCase.execute({
          tokenId: 'token-123',
          tenantId: 'tenant-1',
          userId: 'user-1',
          userRole: 'owner',
        })
      ).rejects.toThrow('At least one field');
    });

    it('should throw error if token does not exist', async () => {
      mockRepository.findById = mock(async () => null);

      await expect(
        useCase.execute({
          tokenId: 'non-existent',
          tenantId: 'tenant-1',
          userId: 'user-1',
          userRole: 'owner',
          name: 'New Name',
        })
      ).rejects.toThrow('Token not found');
    });

    it('should throw error for empty name (whitespace only)', async () => {
      await expect(
        useCase.execute({
          tokenId: 'token-123',
          tenantId: 'tenant-1',
          userId: 'user-1',
          userRole: 'owner',
          name: '   ',
        })
      ).rejects.toThrow('At least one field');
    });

    it('should throw error for name exceeding length limit', async () => {
      const longName = 'a'.repeat(101);
      await expect(
        useCase.execute({
          tokenId: 'token-123',
          tenantId: 'tenant-1',
          userId: 'user-1',
          userRole: 'owner',
          name: longName,
        })
      ).rejects.toThrow('Token name must be 100 characters or less');
    });

    it('should throw error for empty token value (whitespace only)', async () => {
      await expect(
        useCase.execute({
          tokenId: 'token-123',
          tenantId: 'tenant-1',
          userId: 'user-1',
          userRole: 'owner',
          token: '   ',
        })
      ).rejects.toThrow('At least one field');
    });

    it('should reject duplicate names (case insensitive)', async () => {
      mockRepository.findByTenantId = mock(async () => [
        {
          id: 'token-123',
          tenantId: 'tenant-1',
          name: 'Old Token Name',
          createdBy: 'user-1',
          lastUsed: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
        {
          id: 'token-456',
          tenantId: 'tenant-1',
          name: 'Existing Token',
          createdBy: 'user-2',
          lastUsed: null,
          createdAt: new Date('2024-01-01'),
          updatedAt: new Date('2024-01-01'),
        },
      ] as AccessTokenResponse[]);

      await expect(
        useCase.execute({
          tokenId: 'token-123',
          tenantId: 'tenant-1',
          userId: 'user-1',
          userRole: 'owner',
          name: 'existing token',
        })
      ).rejects.toThrow('A token with this name already exists');
    });

    it('should allow updating to same name', async () => {
      const result = await useCase.execute({
        tokenId: 'token-123',
        tenantId: 'tenant-1',
        userId: 'user-1',
        userRole: 'owner',
        name: 'Old Token Name',
      });

      expect(result.name).toBe('Old Token Name');
    });
  });

  describe('token updates', () => {
    it('should update only name when provided', async () => {
      await useCase.execute({
        tokenId: 'token-123',
        tenantId: 'tenant-1',
        userId: 'user-1',
        userRole: 'owner',
        name: 'New Token Name',
      });

      const updateCall = (mockRepository.update as any).mock.calls[0];
      expect(updateCall[0]).toBe('token-123');
      expect(updateCall[1]).toBe('tenant-1');
      expect(updateCall[2].name).toBe('New Token Name');
      expect(updateCall[2].encryptedToken).toBeUndefined();
    });

    it('should update only token when provided', async () => {
      await useCase.execute({
        tokenId: 'token-123',
        tenantId: 'tenant-1',
        userId: 'user-1',
        userRole: 'owner',
        token: 'ghp_new_token',
      });

      const updateCall = (mockRepository.update as any).mock.calls[0];
      expect(updateCall[0]).toBe('token-123');
      expect(updateCall[1]).toBe('tenant-1');
      expect(updateCall[2].name).toBeUndefined();
      expect(updateCall[2].encryptedToken).toBeTruthy();
      expect(updateCall[2].encryptedToken).not.toBe('ghp_new_token');
      expect(updateCall[2].encryptedToken).toContain(':'); // Encrypted format
    });

    it('should update both name and token when provided', async () => {
      await useCase.execute({
        tokenId: 'token-123',
        tenantId: 'tenant-1',
        userId: 'user-1',
        userRole: 'owner',
        name: 'New Token Name',
        token: 'ghp_new_token',
      });

      const updateCall = (mockRepository.update as any).mock.calls[0];
      expect(updateCall[2].name).toBe('New Token Name');
      expect(updateCall[2].encryptedToken).toBeTruthy();
      expect(updateCall[2].encryptedToken).toContain(':');
    });

    it('should trim name before updating', async () => {
      await useCase.execute({
        tokenId: 'token-123',
        tenantId: 'tenant-1',
        userId: 'user-1',
        userRole: 'owner',
        name: '  New Token Name  ',
      });

      const updateCall = (mockRepository.update as any).mock.calls[0];
      expect(updateCall[2].name).toBe('New Token Name');
    });

    it('should return updated token', async () => {
      const result = await useCase.execute({
        tokenId: 'token-123',
        tenantId: 'tenant-1',
        userId: 'user-1',
        userRole: 'owner',
        name: 'New Token Name',
      });

      expect(result.id).toBe('token-123');
      expect(result.name).toBe('New Token Name');
    });
  });
});

