import { describe, it, expect, beforeEach } from 'bun:test';
import { ListAccessTokensUseCase } from '../../src/use-cases/listAccessTokens';
import type { AccessTokenRepository } from '../../src/domain/AccessTokenRepository';
import type { AccessTokenResponse } from '../../src/domain/models';

describe('ListAccessTokensUseCase', () => {
  let mockRepository: AccessTokenRepository;
  let useCase: ListAccessTokensUseCase;

  const mockTokens: AccessTokenResponse[] = [
    {
      id: 'token-1',
      tenantId: 'tenant-1',
      name: 'Main Token',
      createdBy: 'user-1',
      createdByName: 'John Doe',
      lastUsed: new Date('2026-01-10'),
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    },
    {
      id: 'token-2',
      tenantId: 'tenant-1',
      name: 'CI Token',
      createdBy: 'user-2',
      createdByName: 'Jane Smith',
      lastUsed: null,
      createdAt: new Date('2026-01-05'),
      updatedAt: new Date('2026-01-05'),
    },
  ];

  beforeEach(() => {
    mockRepository = {
      findByTenantId: async () => mockTokens,
      findById: async () => null,
      create: async () => ({} as any),
      update: async () => ({} as any),
      delete: async () => {},
      updateLastUsed: async () => {},
    };

    useCase = new ListAccessTokensUseCase(mockRepository);
  });

  it('should return tokens for owner role', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      userRole: 'owner',
    });

    expect(result).toEqual(mockTokens);
  });

  it('should return tokens for admin role', async () => {
    const result = await useCase.execute({
      tenantId: 'tenant-1',
      userRole: 'admin',
    });

    expect(result).toEqual(mockTokens);
  });

  it('should throw error for member role', async () => {
    await expect(
      useCase.execute({
        tenantId: 'tenant-1',
        userRole: 'member',
      })
    ).rejects.toThrow('Insufficient permissions. Only owners and admins can view tokens.');
  });

  it('should return empty array when no tokens exist', async () => {
    mockRepository.findByTenantId = async () => [];

    const result = await useCase.execute({
      tenantId: 'tenant-1',
      userRole: 'owner',
    });

    expect(result).toEqual([]);
  });

  it('should call repository with correct tenant ID', async () => {
    let calledWith: string | undefined;
    mockRepository.findByTenantId = async (tenantId: string) => {
      calledWith = tenantId;
      return mockTokens;
    };

    await useCase.execute({
      tenantId: 'tenant-123',
      userRole: 'owner',
    });

    expect(calledWith).toBe('tenant-123');
  });
});

