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

// Label constraints
export const LABEL_MAX_LENGTH = 50;

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

  // Token validation: Must have either accessTokenId OR personalAccessToken (not both, not neither)
  const hasAccessTokenId = build.accessTokenId && typeof build.accessTokenId === 'string' && build.accessTokenId.trim().length > 0;
  const hasPersonalAccessToken = build.personalAccessToken && typeof build.personalAccessToken === 'string' && build.personalAccessToken.trim().length > 0;

  if (!hasAccessTokenId && !hasPersonalAccessToken) {
    throw new ValidationError('Either a saved Access Token or Personal Access Token is required');
  }

  if (hasAccessTokenId && hasPersonalAccessToken) {
    throw new ValidationError('Cannot specify both saved Access Token and inline Personal Access Token');
  }

  // Cache expiration validation
  if (build.cacheExpirationMinutes === undefined) {
    throw new ValidationError('Cache expiration is required');
  }

  validateCacheExpiration(build.cacheExpirationMinutes);

  // Label validation (optional field)
  if (build.label !== undefined && build.label !== null) {
    if (typeof build.label !== 'string') {
      throw new ValidationError('Label must be a string');
    }

    if (build.label.trim().length > LABEL_MAX_LENGTH) {
      throw new ValidationError(`Label must not exceed ${LABEL_MAX_LENGTH} characters`);
    }
  }
}

// Sanitize build input
export function sanitizeBuild(build: Partial<Build>): Partial<Build> {
  const sanitized: Partial<Build> = {
    ...build,
    name: build.name?.trim(),
    organization: build.organization?.trim(),
    repository: build.repository?.trim(),
    selectors: build.selectors?.map((s) => ({
      ...s,
      pattern: s.pattern.trim(),
    })),
  };

  // Only include token fields if they were explicitly provided
  if ('accessTokenId' in build) {
    sanitized.accessTokenId = build.accessTokenId?.trim() || null;
  }
  if ('personalAccessToken' in build) {
    sanitized.personalAccessToken = build.personalAccessToken?.trim() || null;
  }

  // Sanitize label: trim whitespace and set to null if empty
  if (build.label !== undefined) {
    const trimmed = build.label?.trim();
    sanitized.label = trimmed && trimmed.length > 0 ? trimmed.slice(0, 50) : null;
  }

  return sanitized;
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

// Authentication validation

export function validateEmail(email: string): void {
  if (!email || typeof email !== 'string') {
    throw new ValidationError('Email is required and must be a string');
  }

  const trimmedEmail = email.trim();
  if (trimmedEmail.length === 0) {
    throw new ValidationError('Email cannot be empty');
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmedEmail)) {
    throw new ValidationError('Invalid email format');
  }
}

export function validatePassword(password: string): void {
  if (!password || typeof password !== 'string') {
    throw new ValidationError('Password is required and must be a string');
  }

  if (password.length < 8) {
    throw new ValidationError('Password must be at least 8 characters long');
  }

  if (password.length > 128) {
    throw new ValidationError('Password must not exceed 128 characters');
  }
}

export function validateTenantName(name: string): void {
  if (!name || typeof name !== 'string') {
    throw new ValidationError('Tenant name is required and must be a string');
  }

  const trimmedName = name.trim();
  if (trimmedName.length === 0) {
    throw new ValidationError('Tenant name cannot be empty');
  }

  if (trimmedName.length > 100) {
    throw new ValidationError('Tenant name must not exceed 100 characters');
  }
}

export function validateRole(role: string): void {
  if (!['owner', 'admin', 'member'].includes(role)) {
    throw new ValidationError('Invalid role. Must be one of: owner, admin, member');
  }
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}
