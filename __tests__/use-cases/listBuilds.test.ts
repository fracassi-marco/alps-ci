import { describe, it, expect, mock } from 'bun:test';
import { ListBuildsUseCase } from '../../src/use-cases/listBuilds';
import type { Build } from '../../src/domain/models';

describe('ListBuildsUseCase', () => {
  const mockBuild1: Build = {
    id: '1',
    name: 'Build 1',
    organization: 'org1',
    repository: 'repo1',
    personalAccessToken: 'ghp_token1',
    cacheExpirationMinutes: 30,
    selectors: [{ type: 'branch', pattern: 'main' }],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockBuild2: Build = {
    id: '2',
    name: 'Build 2',
    organization: 'org2',
    repository: 'repo2',
    personalAccessToken: 'ghp_token2',
    cacheExpirationMinutes: 60,
    selectors: [{ type: 'tag', pattern: 'v*' }],
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'),
  };

  it('should return all builds from repository', async () => {
    const mockBuilds: Build[] = [mockBuild1, mockBuild2];

    const mockRepository = {
      findAll: mock(() => Promise.resolve(mockBuilds)),
    };

    const useCase = new ListBuildsUseCase(mockRepository);
    const result = await useCase.execute();

    expect(result).toEqual(mockBuilds);
    expect(mockRepository.findAll).toHaveBeenCalledTimes(1);
  });

  it('should return empty array when no builds exist', async () => {
    const mockRepository = {
      findAll: mock(() => Promise.resolve([])),
    };

    const useCase = new ListBuildsUseCase(mockRepository);
    const result = await useCase.execute();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should propagate repository errors', async () => {
    const mockRepository = {
      findAll: mock(() => Promise.reject(new Error('Database error'))),
    };

    const useCase = new ListBuildsUseCase(mockRepository);

    await expect(useCase.execute()).rejects.toThrow('Database error');
  });
});

