import { mkdir, readFile, writeFile, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import type { Build } from '../domain/models';

export interface BuildRepository {
  findAll(): Promise<Build[]>;
  save(builds: Build[]): Promise<void>;
  backup(): Promise<string>;
  restore(backupTimestamp: string): Promise<void>;
  listBackups(): Promise<string[]>;
}

export class FileSystemBuildRepository implements BuildRepository {
  private readonly configPath: string;
  private readonly backupDir: string;

  constructor(configPath = 'data/config.json', backupDir = 'data/backups') {
    this.configPath = configPath;
    this.backupDir = backupDir;
  }

  private async ensureDirectories(): Promise<void> {
    const configDir = dirname(this.configPath);
    if (!existsSync(configDir)) {
      await mkdir(configDir, { recursive: true });
    }
    if (!existsSync(this.backupDir)) {
      await mkdir(this.backupDir, { recursive: true });
    }
  }

  async findAll(): Promise<Build[]> {
    if (!existsSync(this.configPath)) {
      return [];
    }

    try {
      const content = await readFile(this.configPath, 'utf-8');
      const data = JSON.parse(content);

      // Parse dates
      return data.map((build: any) => ({
        ...build,
        createdAt: new Date(build.createdAt),
        updatedAt: new Date(build.updatedAt),
      }));
    } catch (error) {
      console.error('Failed to read builds:', error);
      return [];
    }
  }

  async save(builds: Build[]): Promise<void> {
    await this.ensureDirectories();
    await writeFile(this.configPath, JSON.stringify(builds, null, 2), 'utf-8');
  }

  async backup(): Promise<string> {
    await this.ensureDirectories();

    if (!existsSync(this.configPath)) {
      throw new Error('No config file to backup');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = join(this.backupDir, `config_${timestamp}.json`);

    await copyFile(this.configPath, backupPath);

    return timestamp;
  }

  async restore(backupTimestamp: string): Promise<void> {
    const backupPath = join(this.backupDir, `config_${backupTimestamp}.json`);

    if (!existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupTimestamp}`);
    }

    await this.ensureDirectories();
    await copyFile(backupPath, this.configPath);
  }

  async listBackups(): Promise<string[]> {
    if (!existsSync(this.backupDir)) {
      return [];
    }

    const { readdir } = await import('fs/promises');
    const files = await readdir(this.backupDir);

    return files
      .filter((file) => file.startsWith('config_') && file.endsWith('.json'))
      .map((file) => file.replace('config_', '').replace('.json', ''))
      .sort()
      .reverse();
  }
}

