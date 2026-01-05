import type { Build } from '../domain/models';

export interface BuildRepository {
  findAll(): Promise<Build[]>;
}

export class ListBuildsUseCase {
  constructor(private repository: BuildRepository) {}

  async execute(): Promise<Build[]> {
    return await this.repository.findAll();
  }
}

