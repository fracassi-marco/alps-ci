import type { Build, Selector, SelectorType } from './models';

// Validation error types
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Cache expiration constraints
export const CACHE_EXPIRATION_MIN = 1; // 1 minute
export const CACHE_EXPIRATION_MAX = 1440; // 1 day (24 hours)

// Selector validation
export function validateSelectorType(type: string): type is SelectorType {
  return ['tag', 'branch', 'workflow'].includes(type);
}

export function validateSelector(selector: Selector): void {
  if (!selector.type) {
    throw new ValidationError('Selector type is required');
  }

  if (!validateSelectorType(selector.type)) {
    throw new ValidationError(
      `Invalid selector type: ${selector.type}. Must be one of: tag, branch, workflow`
    );
  }

  if (!selector.pattern || typeof selector.pattern !== 'string') {
    throw new ValidationError('Selector pattern is required and must be a string');
  }

  if (selector.pattern.trim().length === 0) {
    throw new ValidationError('Selector pattern cannot be empty');
  }
}

// Cache expiration validation
export function validateCacheExpiration(minutes: number): void {
  if (typeof minutes !== 'number' || isNaN(minutes)) {
    throw new ValidationError('Cache expiration must be a valid number');
  }

  if (!Number.isInteger(minutes)) {
    throw new ValidationError('Cache expiration must be an integer');
  }

  if (minutes < CACHE_EXPIRATION_MIN) {
    throw new ValidationError(
      `Cache expiration must be at least ${CACHE_EXPIRATION_MIN} minute`
    );
  }

  if (minutes > CACHE_EXPIRATION_MAX) {
    throw new ValidationError(
      `Cache expiration must not exceed ${CACHE_EXPIRATION_MAX} minutes (1 day)`
    );
  }
}

// Build validation
export function validateBuild(build: Partial<Build>): void {
  // Name validation
  if (!build.name || typeof build.name !== 'string') {
    throw new ValidationError('Build name is required and must be a string');
  }

  if (build.name.trim().length === 0) {
    throw new ValidationError('Build name cannot be empty');
  }

  if (build.name.length > 100) {
    throw new ValidationError('Build name must not exceed 100 characters');
  }

  // Organization validation
  if (!build.organization || typeof build.organization !== 'string') {
    throw new ValidationError('Organization is required and must be a string');
  }

  if (build.organization.trim().length === 0) {
    throw new ValidationError('Organization cannot be empty');
  }

  // Repository validation
  if (!build.repository || typeof build.repository !== 'string') {
    throw new ValidationError('Repository name is required and must be a string');
  }

  if (build.repository.trim().length === 0) {
    throw new ValidationError('Repository name cannot be empty');
  }

  // Selectors validation
  if (!build.selectors || !Array.isArray(build.selectors)) {
    throw new ValidationError('Selectors must be an array');
  }

  if (build.selectors.length === 0) {
    throw new ValidationError('At least one selector is required');
  }

  build.selectors.forEach((selector, index) => {
    try {
      validateSelector(selector);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(`Selector ${index + 1}: ${error.message}`);
      }
      throw error;
    }
  });

  // Personal Access Token validation
  if (!build.personalAccessToken || typeof build.personalAccessToken !== 'string') {
    throw new ValidationError('Personal Access Token is required and must be a string');
  }

  if (build.personalAccessToken.trim().length === 0) {
    throw new ValidationError('Personal Access Token cannot be empty');
  }

  // Cache expiration validation
  if (build.cacheExpirationMinutes === undefined) {
    throw new ValidationError('Cache expiration is required');
  }

  validateCacheExpiration(build.cacheExpirationMinutes);
}

// Sanitize build input
export function sanitizeBuild(build: Partial<Build>): Partial<Build> {
  return {
    ...build,
    name: build.name?.trim(),
    organization: build.organization?.trim(),
    repository: build.repository?.trim(),
    personalAccessToken: build.personalAccessToken?.trim(),
    selectors: build.selectors?.map((s) => ({
      ...s,
      pattern: s.pattern.trim(),
    })),
  };
}

// Check if cache is expired
export function isCacheExpired(
  lastFetchedAt: Date,
  cacheExpirationMinutes: number
): boolean {
  const now = new Date();
  const expirationTime = new Date(lastFetchedAt);
  expirationTime.setMinutes(expirationTime.getMinutes() + cacheExpirationMinutes);
  return now >= expirationTime;
}

