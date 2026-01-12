import { describe, it, expect, mock } from 'bun:test';
import { DeleteBuildUseCase } from '../../src/use-cases/deleteBuild';
import type { Build } from '../../src/domain/models';

describe('DeleteBuildUseCase', () => {
  const tenantId = 'tenant-123';

  const buildToDelete: Build = {
    id: '1',
    tenantId,
    name: 'Build to Delete',
    organization: 'org',
    repository: 'repo',
    personalAccessToken: 'ghp_token',
    cacheExpirationMinutes: 30,
    selectors: [{ type: 'branch', pattern: 'main' }],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  it('should delete build successfully', async () => {
    const mockRepository = {
      findById: mock(() => Promise.resolve(buildToDelete)),
      delete: mock(() => Promise.resolve()),
    };

    const useCase = new DeleteBuildUseCase(mockRepository);
    await useCase.execute('1', tenantId);

    expect(mockRepository.findById).toHaveBeenCalledWith('1', tenantId);
    expect(mockRepository.delete).toHaveBeenCalledWith('1', tenantId);
  });

  it('should throw error if tenantId is not provided', async () => {
    const mockRepository = {
      findById: mock(() => Promise.resolve(buildToDelete)),
      delete: mock(() => Promise.resolve()),
    };

    const useCase = new DeleteBuildUseCase(mockRepository);

    await expect(useCase.execute('1', '')).rejects.toThrow('Tenant ID is required');
    expect(mockRepository.delete).not.toHaveBeenCalled();
  });

  it('should throw error if build does not exist', async () => {
    const mockRepository = {
      findById: mock(() => Promise.resolve(null)),
      delete: mock(() => Promise.resolve()),
    };

    const useCase = new DeleteBuildUseCase(mockRepository);

    await expect(useCase.execute('999', tenantId)).rejects.toThrow('Build with id "999" not found');
    expect(mockRepository.delete).not.toHaveBeenCalled();
  });

  it('should throw error if build belongs to different tenant', async () => {
    const differentTenantBuild: Build = {
      ...buildToDelete,
      tenantId: 'different-tenant',
    };

    const mockRepository = {
      findById: mock(() => Promise.resolve(null)), // Returns null because of tenant filter
      delete: mock(() => Promise.resolve()),
    };

    const useCase = new DeleteBuildUseCase(mockRepository);

    await expect(useCase.execute('1', tenantId)).rejects.toThrow('Build with id "1" not found');
    expect(mockRepository.delete).not.toHaveBeenCalled();
  });

  it('should propagate repository errors', async () => {
    const mockRepository = {
      findById: mock(() => Promise.resolve(buildToDelete)),
      delete: mock(() => Promise.reject(new Error('Database error'))),
    };

    const useCase = new DeleteBuildUseCase(mockRepository);

    await expect(useCase.execute('1', tenantId)).rejects.toThrow('Database error');
  });
});

