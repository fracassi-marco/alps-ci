import { describe, it, expect, mock } from 'bun:test';
import { EditBuildUseCase } from '../../src/use-cases/editBuild';
import type { Build } from '../../src/domain/models';

describe('EditBuildUseCase', () => {
  const existingBuild: Build = {
    id: '1',
    name: 'Original Build',
    organization: 'original-org',
    repository: 'original-repo',
    personalAccessToken: 'ghp_original',
    cacheExpirationMinutes: 30,
    selectors: [{ type: 'branch', pattern: 'main' }],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  it('should update an existing build successfully', async () => {
    const updates: Partial<Build> = {
      name: 'Updated Build',
      cacheExpirationMinutes: 60,
    };

    const mockRepository = {
      findAll: mock(() => Promise.resolve([existingBuild])),
      save: mock(() => Promise.resolve()),
    };

    const useCase = new EditBuildUseCase(mockRepository);
    const result = await useCase.execute('1', updates);

    expect(result.name).toBe('Updated Build');
    expect(result.cacheExpirationMinutes).toBe(60);
    expect(result.organization).toBe('original-org'); // Unchanged
    expect(result.id).toBe('1'); // ID preserved
    expect(result.createdAt).toEqual(existingBuild.createdAt); // Creation date preserved
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.updatedAt.getTime()).toBeGreaterThan(existingBuild.updatedAt.getTime());
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should throw error if build does not exist', async () => {
    const mockRepository = {
      findAll: mock(() => Promise.resolve([existingBuild])),
      save: mock(() => Promise.resolve()),
    };

    const useCase = new EditBuildUseCase(mockRepository);

    await expect(useCase.execute('999', { name: 'Updated' })).rejects.toThrow(
      'Build with id "999" not found'
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should throw error for invalid updated build', async () => {
    const invalidUpdates = { cacheExpirationMinutes: -1 };
    const mockRepository = {
      findAll: mock(() => Promise.resolve([existingBuild])),
      save: mock(() => Promise.resolve()),
    };

    const useCase = new EditBuildUseCase(mockRepository);

    await expect(useCase.execute('1', invalidUpdates)).rejects.toThrow();
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should preserve other builds when updating one', async () => {
    const otherBuild: Build = {
      id: '2',
      name: 'Other Build',
      organization: 'other-org',
      repository: 'other-repo',
      personalAccessToken: 'ghp_other',
      cacheExpirationMinutes: 45,
      selectors: [{ type: 'tag', pattern: 'v*' }],
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    };

    const mockRepository = {
      findAll: mock(() => Promise.resolve([existingBuild, otherBuild])),
      save: mock((builds: Build[]) => {
        expect(builds).toHaveLength(2);
        expect(builds[1]).toEqual(otherBuild); // Other build unchanged
        return Promise.resolve();
      }),
    };

    const useCase = new EditBuildUseCase(mockRepository);
    await useCase.execute('1', { name: 'Updated Build' });

    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should throw error if new name conflicts with existing build', async () => {
    const otherBuild: Build = {
      id: '2',
      name: 'Existing Name',
      organization: 'org',
      repository: 'repo',
      personalAccessToken: 'token',
      cacheExpirationMinutes: 30,
      selectors: [{ type: 'branch', pattern: 'main' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockRepository = {
      findAll: mock(() => Promise.resolve([existingBuild, otherBuild])),
      save: mock(() => Promise.resolve()),
    };

    const useCase = new EditBuildUseCase(mockRepository);

    await expect(useCase.execute('1', { name: 'Existing Name' })).rejects.toThrow(
      'Build with name "Existing Name" already exists'
    );
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should allow keeping the same name', async () => {
    const mockRepository = {
      findAll: mock(() => Promise.resolve([existingBuild])),
      save: mock(() => Promise.resolve()),
    };

    const useCase = new EditBuildUseCase(mockRepository);
    const result = await useCase.execute('1', {
      name: 'Original Build',
      cacheExpirationMinutes: 60,
    });

    expect(result.name).toBe('Original Build');
    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should sanitize input before updating', async () => {
    const dirtyUpdates = {
      name: '  Updated Build  ',
      organization: '  updated-org  ',
    };

    const mockRepository = {
      findAll: mock(() => Promise.resolve([existingBuild])),
      save: mock(() => Promise.resolve()),
    };

    const useCase = new EditBuildUseCase(mockRepository);
    const result = await useCase.execute('1', dirtyUpdates);

    expect(result.name).toBe('Updated Build');
    expect(result.organization).toBe('updated-org');
  });

  it('should update selectors correctly', async () => {
    const newSelectors = [
      { type: 'tag' as const, pattern: 'v*' },
      { type: 'branch' as const, pattern: 'develop' },
    ];

    const mockRepository = {
      findAll: mock(() => Promise.resolve([existingBuild])),
      save: mock(() => Promise.resolve()),
    };

    const useCase = new EditBuildUseCase(mockRepository);
    const result = await useCase.execute('1', {
      name: 'Original Build',
      organization: 'original-org',
      repository: 'original-repo',
      personalAccessToken: 'ghp_original',
      selectors: newSelectors,
      cacheExpirationMinutes: 30,
    });

    expect(result.selectors).toEqual(newSelectors);
  });
});

