import type { Build } from '../domain/models';
import { validateBuild, sanitizeBuild } from '../domain/validation';

export interface BuildRepository {
  findById(id: string, tenantId: string): Promise<Build | null>;
  findAll(tenantId: string): Promise<Build[]>;
  update(id: string, updates: Partial<Build>, tenantId: string): Promise<Build>;
}

export class EditBuildUseCase {
  constructor(private repository: BuildRepository) {}

  async execute(buildId: string, updates: Partial<Build>, tenantId: string): Promise<Build> {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    // Find the existing build in this tenant
    const existingBuild = await this.repository.findById(buildId, tenantId);
    if (!existingBuild) {
      throw new Error(`Build with id "${buildId}" not found`);
    }

    // Sanitize only the provided updates
    const sanitized = sanitizeBuild(updates);

    // Merge updates with existing build
    const cleanedUpdates = Object.fromEntries(
      Object.entries(sanitized).filter(([_, v]) => v !== undefined)
    ) as Partial<Build>;

    const updatedBuild: Build = {
      ...existingBuild,
      ...cleanedUpdates,
      id: buildId, // Preserve original ID
      tenantId: existingBuild.tenantId, // Preserve tenant association
      createdAt: existingBuild.createdAt, // Preserve creation date
      updatedAt: new Date(),
    };

    // Validate the updated build
    validateBuild(updatedBuild);

    // Check for duplicate names within this tenant (excluding current build)
    if (updates.name && updates.name !== existingBuild.name) {
      const builds = await this.repository.findAll(tenantId);
      if (builds.some((b) => b.id !== buildId && b.name === updates.name?.trim())) {
        throw new Error(`Build with name "${updates.name.trim()}" already exists`);
      }
    }

    return await this.repository.update(buildId, cleanedUpdates, tenantId);
  }
}

