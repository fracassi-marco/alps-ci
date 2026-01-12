import type { Build } from '../domain/models';

export interface BuildRepository {
  findById(id: string, tenantId: string): Promise<Build | null>;
  delete(id: string, tenantId: string): Promise<void>;
}

export class DeleteBuildUseCase {
  constructor(private repository: BuildRepository) {}

  async execute(buildId: string, tenantId: string): Promise<void> {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    const build = await this.repository.findById(buildId, tenantId);
    if (!build) {
      throw new Error(`Build with id "${buildId}" not found`);
    }

    await this.repository.delete(buildId, tenantId);
  }
}

