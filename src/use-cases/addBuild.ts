import type { Build } from '../domain/models';
import { validateBuild, sanitizeBuild } from '../domain/validation';

export interface BuildRepository {
  findAll(tenantId: string): Promise<Build[]>;
  create(build: Omit<Build, 'id' | 'createdAt' | 'updatedAt'>, tenantId: string): Promise<Build>;
}

export class AddBuildUseCase {
  constructor(private repository: BuildRepository) {}

  async execute(newBuild: Partial<Build>, tenantId: string): Promise<Build> {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    // Sanitize input
    const sanitized = sanitizeBuild(newBuild);

    // Validate build
    validateBuild(sanitized);

    // Check for duplicate names within this tenant
    const builds = await this.repository.findAll(tenantId);
    if (builds.some((b) => b.name === sanitized.name?.trim())) {
      throw new Error(`Build with name "${sanitized.name}" already exists`);
    }

    // Create build with tenant association
    const buildToAdd: Omit<Build, 'id' | 'createdAt' | 'updatedAt'> = {
      tenantId,
      name: sanitized.name!,
      organization: sanitized.organization!,
      repository: sanitized.repository!,
      selectors: sanitized.selectors!,
      personalAccessToken: sanitized.personalAccessToken!,
      cacheExpirationMinutes: sanitized.cacheExpirationMinutes!,
    };

    return await this.repository.create(buildToAdd, tenantId);
  }
}

