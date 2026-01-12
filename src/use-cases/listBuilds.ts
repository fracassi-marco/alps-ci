import type { Build } from '../domain/models';

export interface BuildRepository {
  findAll(tenantId: string): Promise<Build[]>;
}

export class ListBuildsUseCase {
  constructor(private repository: BuildRepository) {}

  async execute(tenantId: string): Promise<Build[]> {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }
    return await this.repository.findAll(tenantId);
  }
}

