import { describe, it, expect, mock } from 'bun:test';
import { AddBuildUseCase } from '@/use-cases/addBuild';
import type { Build } from '@/domain/models';

describe('AddBuildUseCase', () => {
  const tenantId = 'tenant-123';

  const validBuildInput: Partial<Build> = {
    name: 'Test Build',
    organization: 'test-org',
    repository: 'test-repo',
    accessTokenId: null,
    personalAccessToken: 'ghp_test123',
    cacheExpirationMinutes: 30,
    selectors: [{ type: 'branch', pattern: 'main' }],
  };

  it('should add a valid build successfully', async () => {
    const mockRepository = {
      findAll: mock(() => Promise.resolve([])),
      create: mock((build: any) => Promise.resolve({
        ...build,
        id: 'generated-id',
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };

    const useCase = new AddBuildUseCase(mockRepository);
    const result = await useCase.execute(validBuildInput, tenantId);

    expect(result.name).toBe('Test Build');
    expect(result.organization).toBe('test-org');
    expect(result.tenantId).toBe(tenantId);
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    expect(mockRepository.findAll).toHaveBeenCalledWith(tenantId);
    expect(mockRepository.create).toHaveBeenCalledTimes(1);
  });

  it('should throw error if tenantId is not provided', async () => {
    const mockRepository = {
      findAll: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({} as Build)),
    };

    const useCase = new AddBuildUseCase(mockRepository);

    await expect(useCase.execute(validBuildInput, '')).rejects.toThrow('Tenant ID is required');
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('should throw error if build with same name already exists in tenant', async () => {
    const existingBuild: Build = {
      id: 'existing-id',
      tenantId,
      name: 'Test Build',
      organization: 'org',
      repository: 'repo',
      personalAccessToken: 'token',
      cacheExpirationMinutes: 30,
      selectors: [{ type: 'branch', pattern: 'main' }],
      createdAt: new Date(),
      updatedAt: new Date(),
      accessTokenId: 'ignore',
    };

    const mockRepository = {
      findAll: mock(() => Promise.resolve([existingBuild])),
      create: mock(() => Promise.resolve({} as Build)),
    };

    const useCase = new AddBuildUseCase(mockRepository);

    await expect(useCase.execute(validBuildInput, tenantId)).rejects.toThrow(
      'Build with name "Test Build" already exists'
    );
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('should throw error for invalid build (missing required fields)', async () => {
    const invalidBuild = { ...validBuildInput, name: '' };
    const mockRepository = {
      findAll: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({} as Build)),
    };

    const useCase = new AddBuildUseCase(mockRepository);

    await expect(useCase.execute(invalidBuild, tenantId)).rejects.toThrow();
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('should throw error for invalid cache expiration', async () => {
    const invalidBuild = { ...validBuildInput, cacheExpirationMinutes: -1 };
    const mockRepository = {
      findAll: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({} as Build)),
    };

    const useCase = new AddBuildUseCase(mockRepository);

    await expect(useCase.execute(invalidBuild, tenantId)).rejects.toThrow();
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('should throw error for invalid selector', async () => {
    const invalidBuild = {
      ...validBuildInput,
      selectors: [{ type: 'invalid' as any, pattern: 'test' }],
    };
    const mockRepository = {
      findAll: mock(() => Promise.resolve([])),
      create: mock(() => Promise.resolve({} as Build)),
    };

    const useCase = new AddBuildUseCase(mockRepository);

    await expect(useCase.execute(invalidBuild, tenantId)).rejects.toThrow();
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('should sanitize input before saving', async () => {
    const dirtyInput = {
      ...validBuildInput,
      name: '  Test Build  ',
      organization: '  test-org  ',
    };

    const mockRepository = {
      findAll: mock(() => Promise.resolve([])),
      create: mock((build: any) => Promise.resolve({
        ...build,
        id: 'generated-id',
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };

    const useCase = new AddBuildUseCase(mockRepository);
    const result = await useCase.execute(dirtyInput, tenantId);

    expect(result.name).toBe('Test Build');
    expect(result.organization).toBe('test-org');
  });

  it('should handle label field correctly', async () => {
    const buildWithLabel = {
      ...validBuildInput,
      label: '  Production  ',
    };

    const mockRepository = {
      findAll: mock(() => Promise.resolve([])),
      create: mock((build: any) => Promise.resolve({
        ...build,
        id: 'generated-id',
        tenantId,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };

    const useCase = new AddBuildUseCase(mockRepository);
    const result = await useCase.execute(buildWithLabel, tenantId);

    expect(result.label).toBe('Production');
  });

  it('should set empty label to null', async () => {
    const buildWithEmptyLabel = {
      ...validBuildInput,
      label: '   ',
    };

    const mockRepository = {
      findAll: mock(() => Promise.resolve([])),
      create: mock((build: any) => Promise.resolve({
        ...build,
        id: 'generated-id',
        tenantId,
        label: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    };

    const useCase = new AddBuildUseCase(mockRepository);
    const result = await useCase.execute(buildWithEmptyLabel, tenantId);

    expect(result.label).toBeNull();
  });
});

