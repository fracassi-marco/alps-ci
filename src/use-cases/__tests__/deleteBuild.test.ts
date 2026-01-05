import { describe, it, expect, mock } from 'bun:test';
import { DeleteBuildUseCase } from '../deleteBuild';
import type { Build } from '../../domain/models';

describe('DeleteBuildUseCase', () => {
  const buildToDelete: Build = {
    id: '1',
    name: 'Build to Delete',
    organization: 'org',
    repository: 'repo',
    personalAccessToken: 'ghp_token',
    cacheExpirationMinutes: 30,
    selectors: [{ type: 'branch', pattern: 'main' }],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  it('should delete build and create backup', async () => {
    const mockRepository = {
      findAll: mock(() => Promise.resolve([buildToDelete])),
      save: mock(() => Promise.resolve()),
      backup: mock(() => Promise.resolve('backup_2024-01-01.json')),
    };

    const useCase = new DeleteBuildUseCase(mockRepository);
    await useCase.execute('1');

    expect(mockRepository.backup).toHaveBeenCalledTimes(1);
    expect(mockRepository.save).toHaveBeenCalledWith([]);
  });

  it('should throw error if build does not exist', async () => {
    const mockRepository = {
      findAll: mock(() => Promise.resolve([buildToDelete])),
      save: mock(() => Promise.resolve()),
      backup: mock(() => Promise.resolve('backup.json')),
    };

    const useCase = new DeleteBuildUseCase(mockRepository);

    await expect(useCase.execute('999')).rejects.toThrow('Build with id "999" not found');
    expect(mockRepository.backup).not.toHaveBeenCalled();
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should preserve other builds when deleting one', async () => {
    const otherBuild: Build = {
      id: '2',
      name: 'Other Build',
      organization: 'org2',
      repository: 'repo2',
      personalAccessToken: 'ghp_token2',
      cacheExpirationMinutes: 45,
      selectors: [{ type: 'tag', pattern: 'v*' }],
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
    };

    const mockRepository = {
      findAll: mock(() => Promise.resolve([buildToDelete, otherBuild])),
      save: mock((builds: Build[]) => {
        expect(builds).toHaveLength(1);
        expect(builds[0]).toEqual(otherBuild);
        return Promise.resolve();
      }),
      backup: mock(() => Promise.resolve('backup.json')),
    };

    const useCase = new DeleteBuildUseCase(mockRepository);
    await useCase.execute('1');

    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should create backup before saving', async () => {
    const callOrder: string[] = [];
    const mockRepository = {
      findAll: mock(() => Promise.resolve([buildToDelete])),
      save: mock(() => {
        callOrder.push('save');
        return Promise.resolve();
      }),
      backup: mock(() => {
        callOrder.push('backup');
        return Promise.resolve('backup.json');
      }),
    };

    const useCase = new DeleteBuildUseCase(mockRepository);
    await useCase.execute('1');

    expect(callOrder).toEqual(['backup', 'save']);
  });

  it('should not save if backup fails', async () => {
    const mockRepository = {
      findAll: mock(() => Promise.resolve([buildToDelete])),
      save: mock(() => Promise.resolve()),
      backup: mock(() => Promise.reject(new Error('Backup failed'))),
    };

    const useCase = new DeleteBuildUseCase(mockRepository);

    await expect(useCase.execute('1')).rejects.toThrow('Backup failed');
    expect(mockRepository.save).not.toHaveBeenCalled();
  });

  it('should handle deletion of last build', async () => {
    const mockRepository = {
      findAll: mock(() => Promise.resolve([buildToDelete])),
      save: mock((builds: Build[]) => {
        expect(builds).toHaveLength(0);
        return Promise.resolve();
      }),
      backup: mock(() => Promise.resolve('backup.json')),
    };

    const useCase = new DeleteBuildUseCase(mockRepository);
    await useCase.execute('1');

    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });

  it('should handle deletion from middle of array', async () => {
    const build1: Build = { ...buildToDelete, id: '1', name: 'Build 1' };
    const build2: Build = { ...buildToDelete, id: '2', name: 'Build 2' };
    const build3: Build = { ...buildToDelete, id: '3', name: 'Build 3' };

    const mockRepository = {
      findAll: mock(() => Promise.resolve([build1, build2, build3])),
      save: mock((builds: Build[]) => {
        expect(builds).toHaveLength(2);
        expect(builds[0]?.id).toBe('1');
        expect(builds[1]?.id).toBe('3');
        return Promise.resolve();
      }),
      backup: mock(() => Promise.resolve('backup.json')),
    };

    const useCase = new DeleteBuildUseCase(mockRepository);
    await useCase.execute('2');

    expect(mockRepository.save).toHaveBeenCalledTimes(1);
  });
});

