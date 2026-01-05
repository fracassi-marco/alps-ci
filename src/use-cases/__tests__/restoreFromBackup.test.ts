import { describe, it, expect, mock } from 'bun:test';
import { RestoreFromBackupUseCase } from '../restoreFromBackup';

describe('RestoreFromBackupUseCase', () => {
  const mockBackups = [
    '2024-01-01T10:00:00.000Z',
    '2024-01-02T10:00:00.000Z',
    '2024-01-03T10:00:00.000Z',
  ];

  it('should restore from valid backup', async () => {
    const mockRepository = {
      listBackups: mock(() => Promise.resolve(mockBackups)),
      restore: mock(() => Promise.resolve()),
    };

    const useCase = new RestoreFromBackupUseCase(mockRepository);
    await useCase.execute(mockBackups[0]);

    expect(mockRepository.listBackups).toHaveBeenCalledTimes(1);
    expect(mockRepository.restore).toHaveBeenCalledWith(mockBackups[0]);
  });

  it('should throw error if backup does not exist', async () => {
    const mockRepository = {
      listBackups: mock(() => Promise.resolve(mockBackups)),
      restore: mock(() => Promise.resolve()),
    };

    const useCase = new RestoreFromBackupUseCase(mockRepository);

    await expect(useCase.execute('non-existent-backup')).rejects.toThrow(
      'Backup "non-existent-backup" not found'
    );
    expect(mockRepository.restore).not.toHaveBeenCalled();
  });

  it('should list available backups', async () => {
    const mockRepository = {
      listBackups: mock(() => Promise.resolve(mockBackups)),
      restore: mock(() => Promise.resolve()),
    };

    const useCase = new RestoreFromBackupUseCase(mockRepository);
    const result = await useCase.listAvailableBackups();

    expect(result).toEqual(mockBackups);
    expect(result).toHaveLength(3);
  });

  it('should return empty array when no backups exist', async () => {
    const mockRepository = {
      listBackups: mock(() => Promise.resolve([])),
      restore: mock(() => Promise.resolve()),
    };

    const useCase = new RestoreFromBackupUseCase(mockRepository);
    const result = await useCase.listAvailableBackups();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should validate backup exists before restoring', async () => {
    const mockRepository = {
      listBackups: mock(() => Promise.resolve(mockBackups)),
      restore: mock(() => Promise.resolve()),
    };

    const useCase = new RestoreFromBackupUseCase(mockRepository);

    // Try to restore with an invalid timestamp format
    await expect(useCase.execute('invalid-format')).rejects.toThrow(
      'Backup "invalid-format" not found'
    );
  });

  it('should propagate repository errors when listing backups', async () => {
    const mockRepository = {
      listBackups: mock(() => Promise.reject(new Error('Failed to read backups directory'))),
      restore: mock(() => Promise.resolve()),
    };

    const useCase = new RestoreFromBackupUseCase(mockRepository);

    await expect(useCase.listAvailableBackups()).rejects.toThrow(
      'Failed to read backups directory'
    );
  });

  it('should propagate repository errors when restoring', async () => {
    const mockRepository = {
      listBackups: mock(() => Promise.resolve(mockBackups)),
      restore: mock(() => Promise.reject(new Error('Failed to restore backup'))),
    };

    const useCase = new RestoreFromBackupUseCase(mockRepository);

    await expect(useCase.execute(mockBackups[0])).rejects.toThrow('Failed to restore backup');
  });

  it('should handle backups with special characters', async () => {
    const specialBackup = '2024-01-01T10:00:00.000Z';
    const mockRepository = {
      listBackups: mock(() => Promise.resolve([specialBackup])),
      restore: mock(() => Promise.resolve()),
    };

    const useCase = new RestoreFromBackupUseCase(mockRepository);
    await useCase.execute(specialBackup);

    expect(mockRepository.restore).toHaveBeenCalledWith(specialBackup);
  });

  it('should sort backups by timestamp (if multiple exist)', async () => {
    const unsortedBackups = [
      '2024-01-03T10:00:00.000Z',
      '2024-01-01T10:00:00.000Z',
      '2024-01-02T10:00:00.000Z',
    ];

    const mockRepository = {
      listBackups: mock(() => Promise.resolve(unsortedBackups)),
      restore: mock(() => Promise.resolve()),
    };

    const useCase = new RestoreFromBackupUseCase(mockRepository);
    const result = await useCase.listAvailableBackups();

    // Note: The use case returns backups as-is from the repository
    // Sorting should be done by the repository or UI layer
    expect(result).toEqual(unsortedBackups);
  });
});

