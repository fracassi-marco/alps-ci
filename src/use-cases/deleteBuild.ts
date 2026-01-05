import type { Build } from '../domain/models';

export interface BuildRepository {
  findAll(): Promise<Build[]>;
  save(builds: Build[]): Promise<void>;
  backup(): Promise<string>; // Returns backup filename/timestamp
}

export class DeleteBuildUseCase {
  constructor(private repository: BuildRepository) {}

  async execute(buildId: string): Promise<void> {
    const builds = await this.repository.findAll();
    const index = builds.findIndex((b) => b.id === buildId);

    if (index === -1) {
      throw new Error(`Build with id "${buildId}" not found`);
    }

    // Create backup before deletion
    await this.repository.backup();

    // Remove the build
    builds.splice(index, 1);
    await this.repository.save(builds);
  }
}

