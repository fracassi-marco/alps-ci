import type { Build } from '../domain/models';
import { validateBuild, sanitizeBuild } from '../domain/validation';

export interface BuildRepository {
  findAll(): Promise<Build[]>;
  save(builds: Build[]): Promise<void>;
}

export class AddBuildUseCase {
  constructor(private repository: BuildRepository) {}

  async execute(newBuild: Partial<Build>): Promise<Build> {
    // Sanitize input
    const sanitized = sanitizeBuild(newBuild);

    // Validate build
    validateBuild(sanitized);

    // Generate ID if not provided
    const buildToAdd: Build = {
      ...sanitized,
      id: sanitized.id || this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as Build;

    const builds = await this.repository.findAll();

    // Check for duplicate IDs
    if (builds.some((b) => b.id === buildToAdd.id)) {
      throw new Error(`Build with id "${buildToAdd.id}" already exists`);
    }

    // Check for duplicate names
    if (builds.some((b) => b.name === buildToAdd.name)) {
      throw new Error(`Build with name "${buildToAdd.name}" already exists`);
    }

    builds.push(buildToAdd);
    await this.repository.save(builds);

    return buildToAdd;
  }

  private generateId(): string {
    return `build_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

