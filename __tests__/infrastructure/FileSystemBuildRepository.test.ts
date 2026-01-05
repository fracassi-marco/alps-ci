import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { FileSystemBuildRepository } from '../../src/infrastructure/FileSystemBuildRepository';
import { existsSync } from 'fs';
import { rm, mkdir } from 'fs/promises';
import type { Build } from '../../src/domain/models';

describe('FileSystemBuildRepository', () => {
  const testConfigPath = 'data/test/config.json';
  const testBackupDir = 'data/test/backups';
  let repository: FileSystemBuildRepository;

  const mockBuild: Build = {
    id: 'test-build-1',
    name: 'Test Build',
    organization: 'test-org',
    repository: 'test-repo',
    selectors: [{ type: 'branch', pattern: 'main' }],
    personalAccessToken: 'ghp_test123',
    cacheExpirationMinutes: 30,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  };

  beforeEach(async () => {
    repository = new FileSystemBuildRepository(testConfigPath, testBackupDir);

    // Clean up test directories
    if (existsSync('data/test')) {
      await rm('data/test', { recursive: true, force: true });
    }
  });

  afterEach(async () => {
    // Clean up after tests
    if (existsSync('data/test')) {
      await rm('data/test', { recursive: true, force: true });
    }
  });

  describe('findAll', () => {
    it('should return empty array when config file does not exist', async () => {
      const builds = await repository.findAll();
      expect(builds).toEqual([]);
    });

    it('should return all builds from config file', async () => {
      await repository.save([mockBuild]);
      const builds = await repository.findAll();

      expect(builds).toHaveLength(1);
      expect(builds[0]?.id).toBe('test-build-1');
      expect(builds[0]?.name).toBe('Test Build');
    });

    it('should parse dates correctly', async () => {
      await repository.save([mockBuild]);
      const builds = await repository.findAll();

      expect(builds[0]?.createdAt).toBeInstanceOf(Date);
      expect(builds[0]?.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle multiple builds', async () => {
      const build2 = { ...mockBuild, id: 'test-build-2', name: 'Test Build 2' };
      await repository.save([mockBuild, build2]);

      const builds = await repository.findAll();
      expect(builds).toHaveLength(2);
    });

    it('should return empty array on corrupted file', async () => {
      // Create test directory
      await mkdir('data/test', { recursive: true });

      // Write invalid JSON
      const { writeFile } = await import('fs/promises');
      await writeFile(testConfigPath, 'invalid json', 'utf-8');

      const builds = await repository.findAll();
      expect(builds).toEqual([]);
    });
  });

  describe('save', () => {
    it('should create config file if it does not exist', async () => {
      await repository.save([mockBuild]);

      expect(existsSync(testConfigPath)).toBe(true);
    });

    it('should create directories if they do not exist', async () => {
      await repository.save([mockBuild]);

      expect(existsSync('data/test')).toBe(true);
    });

    it('should write builds to config file', async () => {
      await repository.save([mockBuild]);

      const { readFile } = await import('fs/promises');
      const content = await readFile(testConfigPath, 'utf-8');
      const data = JSON.parse(content);

      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('test-build-1');
    });

    it('should format JSON with 2 spaces', async () => {
      await repository.save([mockBuild]);

      const { readFile } = await import('fs/promises');
      const content = await readFile(testConfigPath, 'utf-8');

      expect(content).toContain('  ');
    });

    it('should overwrite existing config', async () => {
      await repository.save([mockBuild]);

      const build2 = { ...mockBuild, id: 'test-build-2' };
      await repository.save([build2]);

      const builds = await repository.findAll();
      expect(builds).toHaveLength(1);
      expect(builds[0]?.id).toBe('test-build-2');
    });
  });

  describe('backup', () => {
    it('should throw error if config file does not exist', async () => {
      await expect(repository.backup()).rejects.toThrow('No config file to backup');
    });

    it('should create backup file', async () => {
      await repository.save([mockBuild]);
      const timestamp = await repository.backup();

      const backupPath = `${testBackupDir}/config_${timestamp}.json`;
      expect(existsSync(backupPath)).toBe(true);
    });

    it('should create backup directory if it does not exist', async () => {
      await repository.save([mockBuild]);
      await repository.backup();

      expect(existsSync(testBackupDir)).toBe(true);
    });

    it('should return timestamp', async () => {
      await repository.save([mockBuild]);
      const timestamp = await repository.backup();

      expect(timestamp).toBeDefined();
      expect(typeof timestamp).toBe('string');
      expect(timestamp).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
    });

    it('should copy entire config file content', async () => {
      await repository.save([mockBuild]);
      const timestamp = await repository.backup();

      const { readFile } = await import('fs/promises');
      const originalContent = await readFile(testConfigPath, 'utf-8');
      const backupContent = await readFile(`${testBackupDir}/config_${timestamp}.json`, 'utf-8');

      expect(backupContent).toBe(originalContent);
    });
  });

  describe('restore', () => {
    it('should throw error if backup does not exist', async () => {
      await expect(repository.restore('non-existent')).rejects.toThrow(
        'Backup file not found: non-existent'
      );
    });

    it('should restore config from backup', async () => {
      await repository.save([mockBuild]);
      const timestamp = await repository.backup();

      // Modify config
      const build2 = { ...mockBuild, id: 'test-build-2' };
      await repository.save([build2]);

      // Restore from backup
      await repository.restore(timestamp);

      const builds = await repository.findAll();
      expect(builds).toHaveLength(1);
      expect(builds[0]?.id).toBe('test-build-1');
    });

    it('should create directories if they do not exist', async () => {
      await repository.save([mockBuild]);
      const timestamp = await repository.backup();

      // Remove config directory
      await rm('data/test/config.json', { force: true });

      await repository.restore(timestamp);

      expect(existsSync(testConfigPath)).toBe(true);
    });
  });

  describe('listBackups', () => {
    it('should return empty array when backup directory does not exist', async () => {
      const backups = await repository.listBackups();
      expect(backups).toEqual([]);
    });

    it('should list all backup files', async () => {
      await repository.save([mockBuild]);

      const timestamp1 = await repository.backup();
      await new Promise((resolve) => setTimeout(resolve, 10)); // Wait a bit
      const timestamp2 = await repository.backup();

      const backups = await repository.listBackups();
      expect(backups).toHaveLength(2);
      expect(backups).toContain(timestamp1);
      expect(backups).toContain(timestamp2);
    });

    it('should return backups in reverse chronological order (newest first)', async () => {
      await repository.save([mockBuild]);

      const timestamp1 = await repository.backup();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const timestamp2 = await repository.backup();

      const backups = await repository.listBackups();
      expect(backups[0]).toBe(timestamp2);
      expect(backups[1]).toBe(timestamp1);
    });

    it('should filter out non-backup files', async () => {
      await repository.save([mockBuild]);
      await repository.backup();

      // Create a non-backup file
      const { writeFile } = await import('fs/promises');
      await mkdir(testBackupDir, { recursive: true });
      await writeFile(`${testBackupDir}/other.json`, '{}', 'utf-8');

      const backups = await repository.listBackups();
      expect(backups).toHaveLength(1);
    });
  });
});

