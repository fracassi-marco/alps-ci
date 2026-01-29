import { describe, test, expect } from 'bun:test';
import {
  validateSelector,
  validateSelectorType,
  validateBuild,
  sanitizeBuild,
  ValidationError,
} from '@/domain/validation';
import type { Selector, Build } from '@/domain/models';

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

  describe('Label validation', () => {
    test('should accept valid label', () => {
      const build = { ...validBuild, label: 'Production' };
      expect(() => validateBuild(build)).not.toThrow();
    });

    test('should accept null label', () => {
      const build = { ...validBuild, label: null };
      expect(() => validateBuild(build)).not.toThrow();
    });

    test('should accept undefined label (optional field)', () => {
      const build = { ...validBuild, label: undefined };
      expect(() => validateBuild(build)).not.toThrow();
    });

    test('should throw error for label exceeding max length', () => {
      const build = { ...validBuild, label: 'a'.repeat(51) };
      expect(() => validateBuild(build)).toThrow(ValidationError);
      expect(() => validateBuild(build)).toThrow('must not exceed 50 characters');
    });

    test('should accept label with exactly 50 characters', () => {
      const build = { ...validBuild, label: 'a'.repeat(50) };
      expect(() => validateBuild(build)).not.toThrow();
    });

    test('should throw error for non-string label', () => {
      const build = { ...validBuild, label: 123 as any };
      expect(() => validateBuild(build)).toThrow(ValidationError);
      expect(() => validateBuild(build)).toThrow('Label must be a string');
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

  test('should trim and truncate label to max length', () => {
    const build: Partial<Build> = {
      name: 'Test',
      label: '  Production Environment  ',
    };

    const sanitized = sanitizeBuild(build);
    expect(sanitized.label).toBe('Production Environment');
  });

  test('should set empty label to null', () => {
    const build: Partial<Build> = {
      name: 'Test',
      label: '   ',
    };

    const sanitized = sanitizeBuild(build);
    expect(sanitized.label).toBeNull();
  });

  test('should truncate label exceeding max length', () => {
    const longLabel = 'a'.repeat(60);
    const build: Partial<Build> = {
      name: 'Test',
      label: longLabel,
    };

    const sanitized = sanitizeBuild(build);
    expect(sanitized.label?.length).toBe(50);
  });

  test('should preserve null label', () => {
    const build: Partial<Build> = {
      name: 'Test',
      label: null,
    };

    const sanitized = sanitizeBuild(build);
    expect(sanitized.label).toBeNull();
  });
});



