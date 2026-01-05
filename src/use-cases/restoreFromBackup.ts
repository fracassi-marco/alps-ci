export interface BuildRepository {
  restore(backupTimestamp: string): Promise<void>;
  listBackups(): Promise<string[]>;
}

export class RestoreFromBackupUseCase {
  constructor(private repository: BuildRepository) {}

  async execute(backupTimestamp: string): Promise<void> {
    const backups = await this.repository.listBackups();

    if (!backups.includes(backupTimestamp)) {
      throw new Error(`Backup "${backupTimestamp}" not found`);
    }

    await this.repository.restore(backupTimestamp);
  }

  async listAvailableBackups(): Promise<string[]> {
    return await this.repository.listBackups();
  }
}

