import { describe, test, expect } from 'bun:test';
import {
  validateSelector,
  validateSelectorType,
  validateCacheExpiration,
  validateBuild,
  sanitizeBuild,
  isCacheExpired,
  ValidationError,
  CACHE_EXPIRATION_MIN,
  CACHE_EXPIRATION_MAX,
} from '../../src/domain/validation';
import type { Selector, Build } from '../../src/domain/models';

describe('Validation - Selector Type', () => {
  test('should validate correct selector types', () => {
    expect(validateSelectorType('tag')).toBe(true);
    expect(validateSelectorType('branch')).toBe(true);
    expect(validateSelectorType('workflow')).toBe(true);
  });

  test('should reject invalid selector types', () => {
    expect(validateSelectorType('invalid')).toBe(false);
    expect(validateSelectorType('')).toBe(false);
    expect(validateSelectorType('TAG')).toBe(false); // Case sensitive
  });
});

describe('Validation - Selector', () => {
  test('should validate a correct selector', () => {
    const selector: Selector = {
      type: 'tag',
      pattern: 'v*.*.*',
    };
    expect(() => validateSelector(selector)).not.toThrow();
  });

  test('should throw error when type is missing', () => {
    const selector = {
      pattern: 'main',
    } as any;
    expect(() => validateSelector(selector)).toThrow(ValidationError);
    expect(() => validateSelector(selector)).toThrow('Selector type is required');
  });

  test('should throw error for invalid selector type', () => {
    const selector: any = {
      type: 'invalid',
      pattern: 'main',
    };
    expect(() => validateSelector(selector)).toThrow(ValidationError);
    expect(() => validateSelector(selector)).toThrow('Invalid selector type');
  });

  test('should throw error when pattern is missing', () => {
    const selector = {
      type: 'branch',
    } as any;
    expect(() => validateSelector(selector)).toThrow(ValidationError);
    expect(() => validateSelector(selector)).toThrow('pattern is required');
  });

  test('should throw error for empty pattern', () => {
    const selector: Selector = {
      type: 'branch',
      pattern: '   ',
    };
    expect(() => validateSelector(selector)).toThrow(ValidationError);
    expect(() => validateSelector(selector)).toThrow('pattern cannot be empty');
  });

  test('should validate all selector types', () => {
    const tagSelector: Selector = { type: 'tag', pattern: 'v1.0.0' };
    const branchSelector: Selector = { type: 'branch', pattern: 'main' };
    const workflowSelector: Selector = { type: 'workflow', pattern: 'CI' };

    expect(() => validateSelector(tagSelector)).not.toThrow();
    expect(() => validateSelector(branchSelector)).not.toThrow();
    expect(() => validateSelector(workflowSelector)).not.toThrow();
  });
});

describe('Validation - Cache Expiration', () => {
  test('should validate cache expiration within valid range', () => {
    expect(() => validateCacheExpiration(1)).not.toThrow();
    expect(() => validateCacheExpiration(60)).not.toThrow();
    expect(() => validateCacheExpiration(1440)).not.toThrow();
  });

  test('should throw error for values below minimum', () => {
    expect(() => validateCacheExpiration(0)).toThrow(ValidationError);
    expect(() => validateCacheExpiration(-1)).toThrow(ValidationError);
    expect(() => validateCacheExpiration(0)).toThrow(`at least ${CACHE_EXPIRATION_MIN}`);
  });

  test('should throw error for values above maximum', () => {
    expect(() => validateCacheExpiration(1441)).toThrow(ValidationError);
    expect(() => validateCacheExpiration(2000)).toThrow(ValidationError);
    expect(() => validateCacheExpiration(1441)).toThrow(`not exceed ${CACHE_EXPIRATION_MAX}`);
  });

  test('should throw error for non-integer values', () => {
    expect(() => validateCacheExpiration(1.5)).toThrow(ValidationError);
    expect(() => validateCacheExpiration(59.9)).toThrow(ValidationError);
    expect(() => validateCacheExpiration(1.5)).toThrow('must be an integer');
  });

  test('should throw error for NaN', () => {
    expect(() => validateCacheExpiration(NaN)).toThrow(ValidationError);
    expect(() => validateCacheExpiration(NaN)).toThrow('must be a valid number');
  });

  test('should validate boundary values', () => {
    expect(() => validateCacheExpiration(CACHE_EXPIRATION_MIN)).not.toThrow();
    expect(() => validateCacheExpiration(CACHE_EXPIRATION_MAX)).not.toThrow();
  });
});

describe('Validation - Build', () => {
  const validBuild: Partial<Build> = {
    name: 'Test Build',
    organization: 'test-org',
    repository: 'test-repo',
    selectors: [
      { type: 'tag', pattern: 'v*.*.*' },
      { type: 'branch', pattern: 'main' },
    ],
    accessTokenId: null,
    personalAccessToken: 'ghp_test_token_123',
    cacheExpirationMinutes: 60,
  };

  test('should validate a correct build', () => {
    expect(() => validateBuild(validBuild)).not.toThrow();
  });

  describe('Name validation', () => {
    test('should throw error for missing name', () => {
      const build = { ...validBuild, name: undefined };
      expect(() => validateBuild(build)).toThrow(ValidationError);
      expect(() => validateBuild(build)).toThrow('name is required');
    });

    test('should throw error for empty name', () => {
      const build = { ...validBuild, name: '   ' };
      expect(() => validateBuild(build)).toThrow(ValidationError);
      expect(() => validateBuild(build)).toThrow('name cannot be empty');
    });

    test('should throw error for name exceeding 100 characters', () => {
      const build = { ...validBuild, name: 'a'.repeat(101) };
      expect(() => validateBuild(build)).toThrow(ValidationError);
      expect(() => validateBuild(build)).toThrow('must not exceed 100 characters');
    });

    test('should accept name with exactly 100 characters', () => {
      const build = { ...validBuild, name: 'a'.repeat(100) };
      expect(() => validateBuild(build)).not.toThrow();
    });
  });

  describe('Organization validation', () => {
    test('should throw error for missing organization', () => {
      const build = { ...validBuild, organization: undefined };
      expect(() => validateBuild(build)).toThrow(ValidationError);
      expect(() => validateBuild(build)).toThrow('Organization is required');
    });

    test('should throw error for empty organization', () => {
      const build = { ...validBuild, organization: '   ' };
      expect(() => validateBuild(build)).toThrow(ValidationError);
      expect(() => validateBuild(build)).toThrow('Organization cannot be empty');
    });
  });

  describe('Repository validation', () => {
    test('should throw error for missing repository', () => {
      const build = { ...validBuild, repository: undefined };
      expect(() => validateBuild(build)).toThrow(ValidationError);
      expect(() => validateBuild(build)).toThrow('Repository name is required');
    });

    test('should throw error for empty repository', () => {
      const build = { ...validBuild, repository: '   ' };
      expect(() => validateBuild(build)).toThrow(ValidationError);
      expect(() => validateBuild(build)).toThrow('Repository name cannot be empty');
    });
  });

  describe('Selectors validation', () => {
    test('should throw error for missing selectors', () => {
      const build = { ...validBuild, selectors: undefined };
      expect(() => validateBuild(build)).toThrow(ValidationError);
      expect(() => validateBuild(build)).toThrow('Selectors must be an array');
    });

    test('should throw error for non-array selectors', () => {
      const build = { ...validBuild, selectors: 'not-an-array' as any };
      expect(() => validateBuild(build)).toThrow(ValidationError);
      expect(() => validateBuild(build)).toThrow('Selectors must be an array');
    });

    test('should throw error for empty selectors array', () => {
      const build = { ...validBuild, selectors: [] };
      expect(() => validateBuild(build)).toThrow(ValidationError);
      expect(() => validateBuild(build)).toThrow('At least one selector is required');
    });

    test('should throw error for invalid selector in array', () => {
      const build = {
        ...validBuild,
        selectors: [
          { type: 'tag', pattern: 'v1.0.0' },
          { type: 'invalid', pattern: 'test' } as any,
        ],
      };
      expect(() => validateBuild(build)).toThrow(ValidationError);
      expect(() => validateBuild(build)).toThrow('Selector 2');
    });

  test('should accept multiple valid selectors of mixed types', () => {
    const build = {
      ...validBuild,
      selectors: [
        { type: 'tag' as const, pattern: 'v*' },
        { type: 'branch' as const, pattern: 'main' },
        { type: 'workflow' as const, pattern: 'CI' },
      ],
    };
    expect(() => validateBuild(build)).not.toThrow();
  });
  });

  describe('Personal Access Token validation', () => {
    test('should throw error for missing token', () => {
      const build = { ...validBuild, personalAccessToken: undefined, accessTokenId: undefined };
      expect(() => validateBuild(build)).toThrow(ValidationError);
      expect(() => validateBuild(build)).toThrow('Either a saved Access Token or Personal Access Token is required');
    });

    test('should throw error for empty token', () => {
      const build = { ...validBuild, personalAccessToken: '   ', accessTokenId: undefined };
      expect(() => validateBuild(build)).toThrow(ValidationError);
      expect(() => validateBuild(build)).toThrow('Either a saved Access Token or Personal Access Token is required');
    });

    test('should accept accessTokenId instead of personalAccessToken', () => {
      const build = { ...validBuild, personalAccessToken: undefined, accessTokenId: 'token-123' };
      expect(() => validateBuild(build)).not.toThrow();
    });

    test('should throw error when both accessTokenId and personalAccessToken are provided', () => {
      const build = { ...validBuild, personalAccessToken: 'ghp_token', accessTokenId: 'token-123' };
      expect(() => validateBuild(build)).toThrow(ValidationError);
      expect(() => validateBuild(build)).toThrow('Cannot specify both saved Access Token and inline Personal Access Token');
    });
  });

  describe('Cache expiration validation', () => {
    test('should throw error for missing cache expiration', () => {
      const build = { ...validBuild, cacheExpirationMinutes: undefined };
      expect(() => validateBuild(build)).toThrow(ValidationError);
      expect(() => validateBuild(build)).toThrow('Cache expiration is required');
    });

    test('should throw error for invalid cache expiration', () => {
      const build = { ...validBuild, cacheExpirationMinutes: 0 };
      expect(() => validateBuild(build)).toThrow(ValidationError);
    });
  });
});

describe('Validation - Sanitize Build', () => {
  test('should trim whitespace from string fields', () => {
    const build: Partial<Build> = {
      name: '  Test Build  ',
      organization: '  test-org  ',
      repository: '  test-repo  ',
      personalAccessToken: '  token123  ',
      selectors: [{ type: 'tag', pattern: '  v1.0.0  ' }],
      cacheExpirationMinutes: 60,
    };

    const sanitized = sanitizeBuild(build);

    expect(sanitized.name).toBe('Test Build');
    expect(sanitized.organization).toBe('test-org');
    expect(sanitized.repository).toBe('test-repo');
    expect(sanitized.personalAccessToken).toBe('token123');
    expect(sanitized.selectors?.[0]?.pattern).toBe('v1.0.0');
  });

  test('should handle undefined fields gracefully', () => {
    const build: Partial<Build> = {
      name: 'Test',
    };

    const sanitized = sanitizeBuild(build);
    expect(sanitized.name).toBe('Test');
    expect(sanitized.organization).toBeUndefined();
  });

  test('should preserve selector types', () => {
    const build: Partial<Build> = {
      selectors: [
        { type: 'tag', pattern: '  v1.0.0  ' },
        { type: 'branch', pattern: '  main  ' },
      ],
    };

    const sanitized = sanitizeBuild(build);
    expect(sanitized.selectors?.[0]?.type).toBe('tag');
    expect(sanitized.selectors?.[1]?.type).toBe('branch');
  });
});

describe('Validation - Cache Expiration Check', () => {
  test('should return false when cache is not expired', () => {
    const lastFetched = new Date();
    const expirationMinutes = 60;

    expect(isCacheExpired(lastFetched, expirationMinutes)).toBe(false);
  });

  test('should return true when cache is expired', () => {
    const lastFetched = new Date();
    lastFetched.setMinutes(lastFetched.getMinutes() - 61);
    const expirationMinutes = 60;

    expect(isCacheExpired(lastFetched, expirationMinutes)).toBe(true);
  });

  test('should return false when cache is exactly at expiration time', () => {
    const lastFetched = new Date();
    lastFetched.setMinutes(lastFetched.getMinutes() - 60);
    const expirationMinutes = 60;

    // Should be expired (>= expiration time)
    expect(isCacheExpired(lastFetched, expirationMinutes)).toBe(true);
  });

  test('should handle minimum cache expiration (1 minute)', () => {
    const lastFetched = new Date();
    lastFetched.setSeconds(lastFetched.getSeconds() - 30);

    expect(isCacheExpired(lastFetched, 1)).toBe(false);

    lastFetched.setMinutes(lastFetched.getMinutes() - 1);
    expect(isCacheExpired(lastFetched, 1)).toBe(true);
  });

  test('should handle maximum cache expiration (1 day)', () => {
    const lastFetched = new Date();
    lastFetched.setMinutes(lastFetched.getMinutes() - 1439);

    expect(isCacheExpired(lastFetched, 1440)).toBe(false);

    lastFetched.setMinutes(lastFetched.getMinutes() - 2);
    expect(isCacheExpired(lastFetched, 1440)).toBe(true);
  });
});

