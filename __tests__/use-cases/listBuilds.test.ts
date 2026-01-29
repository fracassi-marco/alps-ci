import { describe, it, expect, mock } from 'bun:test';
import { ListBuildsUseCase } from '@/use-cases/listBuilds';
import type { Build } from '@/domain/models';

describe('ListBuildsUseCase', () => {
  const tenantId = 'tenant-123';

  const mockBuild1: Build = {
    id: '1',
    tenantId,
    name: 'Build 1',
    organization: 'org1',
    repository: 'repo1',
    personalAccessToken: 'ghp_token1',
    selectors: [{ type: 'branch', pattern: 'main' }],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    accessTokenId: 'ignore',
  };

  const mockBuild2: Build = {
    id: '2',
    tenantId,
    name: 'Build 2',
    organization: 'org2',
    repository: 'repo2',
    personalAccessToken: 'ghp_token2',
    selectors: [{ type: 'tag', pattern: 'v*' }],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
    accessTokenId: 'ignore',
  };

  it('should return all builds from repository for tenant', async () => {
    const mockBuilds: Build[] = [mockBuild1, mockBuild2];

    const mockRepository = {
      findAll: mock(() => Promise.resolve(mockBuilds)),
    };

    const useCase = new ListBuildsUseCase(mockRepository);
    const result = await useCase.execute(tenantId);

    expect(result).toEqual(mockBuilds);
    expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    expect(mockRepository.findAll).toHaveBeenCalledWith(tenantId);
  });

  it('should return empty array when no builds exist for tenant', async () => {
    const mockRepository = {
      findAll: mock(() => Promise.resolve([])),
    };

    const useCase = new ListBuildsUseCase(mockRepository);
    const result = await useCase.execute(tenantId);

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should throw error if tenantId is not provided', async () => {
    const mockRepository = {
      findAll: mock(() => Promise.resolve([])),
    };

    const useCase = new ListBuildsUseCase(mockRepository);

    await expect(useCase.execute('')).rejects.toThrow('Tenant ID is required');
  });

  it('should propagate repository errors', async () => {
    const mockRepository = {
      findAll: mock(() => Promise.reject(new Error('Database error'))),
    };

    const useCase = new ListBuildsUseCase(mockRepository);

    await expect(useCase.execute(tenantId)).rejects.toThrow('Database error');
  });
});

