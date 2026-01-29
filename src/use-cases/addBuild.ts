import type { Build } from '../domain/models';
import { validateBuild, sanitizeBuild } from '../domain/validation';
import type { AccessTokenRepository } from '../domain/AccessTokenRepository';

export interface BuildRepository {
  findAll(tenantId: string): Promise<Build[]>;
  create(build: Omit<Build, 'id' | 'createdAt' | 'updatedAt'>, tenantId: string): Promise<Build>;
}

export class AddBuildUseCase {
  constructor(
    private repository: BuildRepository,
    private accessTokenRepository?: AccessTokenRepository
  ) {}

  async execute(newBuild: Partial<Build>, tenantId: string): Promise<Build> {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    // Sanitize input
    const sanitized = sanitizeBuild(newBuild);

    // Validate build
    validateBuild(sanitized);

    // If using saved access token, verify it exists in this tenant
    if (sanitized.accessTokenId && this.accessTokenRepository) {
      const accessToken = await this.accessTokenRepository.findById(sanitized.accessTokenId, tenantId);
      if (!accessToken) {
        throw new Error('Selected Access Token not found or does not belong to this organization');
      }
    }

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
      label: sanitized.label || null,
      selectors: sanitized.selectors!,
      accessTokenId: sanitized.accessTokenId || null,
      personalAccessToken: sanitized.personalAccessToken || null,
    };

    return await this.repository.create(buildToAdd, tenantId);
  }
}
