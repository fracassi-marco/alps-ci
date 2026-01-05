import { describe, it, expect, mock } from 'bun:test';
import { AddBuildUseCase } from '../addBuild';
import type { Build } from '../../domain/models';

describe('AddBuildUseCase', () => {
  const validBuildInput: Partial<Build> = {
    name: 'Test Build',
    organization: 'test-org',
    repository: 'test-repo',
    personalAccessToken: 'ghp_test123',
    cacheExpirationMinutes: 30,
    selectors: [{ type: 'branch', pattern: 'main' }],
  };

  it('should add a valid build successfully', async () => {
    const mockRepository = {
      findAll: mock(() => Promise.resolve([])),
      save: mock(() => Promise.resolve()),
    };

    const useCase = new AddBuildUseCase(mockRepository);
    const result = await useCase.execute(validBuildInput);

    expect(result.name).toBe('Test Build');
    expect(result.organization).toBe('test-org');
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should generate an ID if not provided', async () => {
    const mockRepository = {
      findAll: mock(() => Promise.resolve([])),
      save: mock(() => Promise.resolve()),
    };

    const useCase = new AddBuildUseCase(mockRepository);
    const result = await useCase.execute(validBuildInput);

    expect(result.id).toBeDefined();
    expect(result.id).toMatch(/^build_\d+_[a-z0-9]+$/);
  });

  it('should use provided ID if given', async () => {
    const mockRepository = {
      findAll: mock(() => Promise.resolve([])),
      save: mock(() => Promise.resolve()),
    };

    const useCase = new AddBuildUseCase(mockRepository);
    const result = await useCase.execute({ ...validBuildInput, id: 'custom-id' });

    expect(result.id).toBe('custom-id');
  });

  it('should throw error if build with same id already exists', async () => {
    const existingBuild: Build = {
      id: 'existing-id',
      name: 'Existing Build',
      organization: 'org',
      repository: 'repo',
      personalAccessToken: 'token',
      cacheExpirationMinutes: 30,
      selectors: [{ type: 'branch', pattern: 'main' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockRepository = {
      findAll: mock(() => Promise.resolve([existingBuild])),
      save: mock(() => Promise.resolve()),
    };

    const useCase = new AddBuildUseCase(mockRepository);

    await expect(
      useCase.execute({ ...validBuildInput, id: 'existing-id' })
    ).rejects.toThrow('Build with id "existing-id" already exists');
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should throw error if build with same name already exists', async () => {
    const existingBuild: Build = {
      id: 'existing-id',
      name: 'Test Build',
      organization: 'org',
      repository: 'repo',
      personalAccessToken: 'token',
      cacheExpirationMinutes: 30,
      selectors: [{ type: 'branch', pattern: 'main' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockRepository = {
      findAll: mock(() => Promise.resolve([existingBuild])),
      save: mock(() => Promise.resolve()),
    };

    const useCase = new AddBuildUseCase(mockRepository);

    await expect(useCase.execute(validBuildInput)).rejects.toThrow(
      'Build with name "Test Build" already exists'
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should throw error for invalid build (missing required fields)', async () => {
    const invalidBuild = { ...validBuildInput, name: '' };
    const mockRepository = {
      findAll: mock(() => Promise.resolve([])),
      save: mock(() => Promise.resolve()),
    };

    const useCase = new AddBuildUseCase(mockRepository);

    await expect(useCase.execute(invalidBuild)).rejects.toThrow();
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should throw error for invalid cache expiration', async () => {
    const invalidBuild = { ...validBuildInput, cacheExpirationMinutes: -1 };
    const mockRepository = {
      findAll: mock(() => Promise.resolve([])),
      save: mock(() => Promise.resolve()),
    };

    const useCase = new AddBuildUseCase(mockRepository);

    await expect(useCase.execute(invalidBuild)).rejects.toThrow();
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should throw error for invalid selector', async () => {
    const invalidBuild = {
      ...validBuildInput,
      selectors: [{ type: 'invalid' as any, pattern: 'test' }],
    };
    const mockRepository = {
      findAll: mock(() => Promise.resolve([])),
      save: mock(() => Promise.resolve()),
    };

    const useCase = new AddBuildUseCase(mockRepository);

    await expect(useCase.execute(invalidBuild)).rejects.toThrow();
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should sanitize input before saving', async () => {
    const dirtyInput = {
      ...validBuildInput,
      name: '  Test Build  ',
      organization: '  test-org  ',
    };

    const mockRepository = {
      findAll: mock(() => Promise.resolve([])),
      save: mock(() => Promise.resolve()),
    };

    const useCase = new AddBuildUseCase(mockRepository);
    const result = await useCase.execute(dirtyInput);

    expect(result.name).toBe('Test Build');
    expect(result.organization).toBe('test-org');
  });
});

