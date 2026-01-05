import type { Build } from '../domain/models';
import { validateBuild, sanitizeBuild } from '../domain/validation';

export interface BuildRepository {
  findAll(): Promise<Build[]>;
  save(builds: Build[]): Promise<void>;
}

export class EditBuildUseCase {
  constructor(private repository: BuildRepository) {}

  async execute(buildId: string, updates: Partial<Build>): Promise<Build> {
    const builds = await this.repository.findAll();
    const index = builds.findIndex((b) => b.id === buildId);

    if (index === -1) {
      throw new Error(`Build with id "${buildId}" not found`);
    }

    const existingBuild = builds[index];
    if (!existingBuild) {
      throw new Error(`Build with id "${buildId}" not found`);
    }

    // Sanitize only the provided updates
    const sanitized = sanitizeBuild(updates);

    // Merge updates with existing build, removing undefined values from sanitized
    const cleanedUpdates = Object.fromEntries(
      Object.entries(sanitized).filter(([_, v]) => v !== undefined)
    ) as Partial<Build>;

    const updatedBuild: Build = {
      ...existingBuild,
      ...cleanedUpdates,
      id: buildId, // Preserve original ID
      createdAt: existingBuild.createdAt, // Preserve creation date
      updatedAt: new Date(),
    };

    // Validate the updated build
    validateBuild(updatedBuild);

    // Check for duplicate names (excluding current build)
    if (
      updates.name &&
      updates.name !== existingBuild.name &&
      builds.some((b) => b.id !== buildId && b.name === updates.name?.trim())
    ) {
      throw new Error(`Build with name "${updates.name.trim()}" already exists`);
    }

    builds[index] = updatedBuild;
    await this.repository.save(builds);

    return updatedBuild;
  }
}

