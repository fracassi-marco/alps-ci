import { describe, it, expect, mock } from 'bun:test';
import { EditBuildUseCase } from '@/use-cases/editBuild';
import type { Build } from '@/domain/models';

describe('EditBuildUseCase', () => {
  const tenantId = 'tenant-123';

  const existingBuild: Build = {
    id: '1',
    tenantId,
    name: 'Original Build',
    organization: 'original-org',
    repository: 'original-repo',
    accessTokenId: null,
    personalAccessToken: 'ghp_original',
    selectors: [{ type: 'branch', pattern: 'main' }],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  it('should update an existing build successfully', async () => {
    const updates: Partial<Build> = {
      name: 'Updated Build',
      organization: 'updated-org',
    };

    const updatedBuild = {
      ...existingBuild,
      ...updates,
      updatedAt: new Date(),
    };

    const mockRepository = {
      findById: mock(() => Promise.resolve(existingBuild)),
      findAll: mock(() => Promise.resolve([existingBuild])),
      update: mock(() => Promise.resolve(updatedBuild)),
    };

    const useCase = new EditBuildUseCase(mockRepository);
    const result = await useCase.execute('1', updates, tenantId);

    expect(result.name).toBe('Updated Build');
    expect(result.organization).toBe('updated-org');
    expect(result.id).toBe('1'); // ID preserved
    expect(result.tenantId).toBe(tenantId); // Tenant preserved
    expect(mockRepository.findById).toHaveBeenCalledWith('1', tenantId);
    expect(mockRepository.update).toHaveBeenCalledTimes(1);
  });

  it('should throw error if tenantId is not provided', async () => {
    const mockRepository = {
      findById: mock(() => Promise.resolve(existingBuild)),
      findAll: mock(() => Promise.resolve([])),
      update: mock(() => Promise.resolve({} as Build)),
    };

    const useCase = new EditBuildUseCase(mockRepository);

    await expect(useCase.execute('1', { name: 'Updated' }, '')).rejects.toThrow('Tenant ID is required');
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('should throw error if build does not exist', async () => {
    const mockRepository = {
      findById: mock(() => Promise.resolve(null)),
      findAll: mock(() => Promise.resolve([])),
      update: mock(() => Promise.resolve({} as Build)),
    };

    const useCase = new EditBuildUseCase(mockRepository);

    await expect(useCase.execute('999', { name: 'Updated' }, tenantId)).rejects.toThrow(
      'Build with id "999" not found'
    );
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('should throw error if new name conflicts with existing build in same tenant', async () => {
    const otherBuild: Build = {
      id: '2',
      tenantId,
      name: 'Existing Name',
      organization: 'org',
      repository: 'repo',
      personalAccessToken: 'ghp_token',
      selectors: [{ type: 'branch', pattern: 'main' }],
      createdAt: new Date(),
      updatedAt: new Date(),
      accessTokenId: 'ignore',
    };

    const mockRepository = {
      findById: mock(() => Promise.resolve(existingBuild)),
      findAll: mock(() => Promise.resolve([existingBuild, otherBuild])),
      update: mock(() => Promise.resolve({} as Build)),
    };

    const useCase = new EditBuildUseCase(mockRepository);

    await expect(useCase.execute('1', { name: 'Existing Name' }, tenantId)).rejects.toThrow(
      'Build with name "Existing Name" already exists'
    );
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('should allow updating to same name', async () => {
    const updates = { organization: 'updated-org' };
    const updatedBuild = {
      ...existingBuild,
      ...updates,
      updatedAt: new Date(),
    };

    const mockRepository = {
      findById: mock(() => Promise.resolve(existingBuild)),
      findAll: mock(() => Promise.resolve([existingBuild])),
      update: mock(() => Promise.resolve(updatedBuild)),
    };

    const useCase = new EditBuildUseCase(mockRepository);
    const result = await useCase.execute('1', updates, tenantId);

    expect(result.name).toBe('Original Build');
    expect(result.organization).toBe('updated-org');
    expect(mockRepository.update).toHaveBeenCalledTimes(1);
  });

  it('should sanitize input before updating', async () => {
    const dirtyUpdates = {
      name: '  Updated Build  ',
      organization: '  updated-org  ',
    };

    const updatedBuild = {
      ...existingBuild,
      name: 'Updated Build',
      organization: 'updated-org',
      updatedAt: new Date(),
    };

    const mockRepository = {
      findById: mock(() => Promise.resolve(existingBuild)),
      findAll: mock(() => Promise.resolve([existingBuild])),
      update: mock(() => Promise.resolve(updatedBuild)),
    };

    const useCase = new EditBuildUseCase(mockRepository);
    const result = await useCase.execute('1', dirtyUpdates, tenantId);

    expect(result.name).toBe('Updated Build');
    expect(result.organization).toBe('updated-org');
  });

  it('should update label field correctly', async () => {
    const updates = {
      label: '  Staging  ',
    };

    const updatedBuild = {
      ...existingBuild,
      label: 'Staging',
      updatedAt: new Date(),
    };

    const mockRepository = {
      findById: mock(() => Promise.resolve(existingBuild)),
      findAll: mock(() => Promise.resolve([existingBuild])),
      update: mock(() => Promise.resolve(updatedBuild)),
    };

    const useCase = new EditBuildUseCase(mockRepository);
    const result = await useCase.execute('1', updates, tenantId);

    expect(result.label).toBe('Staging');
    expect(mockRepository.update).toHaveBeenCalledTimes(1);
  });

  it('should set empty label to null when updating', async () => {
    const updates = {
      label: '   ',
    };

    const updatedBuild = {
      ...existingBuild,
      label: null,
      updatedAt: new Date(),
    };

    const mockRepository = {
      findById: mock(() => Promise.resolve(existingBuild)),
      findAll: mock(() => Promise.resolve([existingBuild])),
      update: mock(() => Promise.resolve(updatedBuild)),
    };

    const useCase = new EditBuildUseCase(mockRepository);
    const result = await useCase.execute('1', updates, tenantId);

    expect(result.label).toBeNull();
  });
});


