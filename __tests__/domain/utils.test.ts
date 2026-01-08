import { describe, test, expect } from 'bun:test';
import {
  generateBuildId,
  calculateHealthPercentage,
  getHealthBadgeColor,
  formatDate,
  parseDate,
  createBuild,
  updateBuildTimestamp,
  hasStats,
  getLastNDaysRange,
  formatDateYYYYMMDD,
} from '../../src/domain/utils';
import type { Build, BuildStats, Selector } from '../../src/domain/models';

describe('Utils - Generate Build ID', () => {
  test('should generate a unique ID', () => {
    const id1 = generateBuildId();
    const id2 = generateBuildId();

    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });

  test('should generate a 32-character hex string', () => {
    const id = generateBuildId();
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  test('should generate different IDs on multiple calls', () => {
    const ids = new Set();
    for (let i = 0; i < 100; i++) {
      ids.add(generateBuildId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('Utils - Calculate Health Percentage', () => {
  test('should calculate correct percentage', () => {
    expect(calculateHealthPercentage(80, 100)).toBe(80);
    expect(calculateHealthPercentage(50, 100)).toBe(50);
    expect(calculateHealthPercentage(100, 100)).toBe(100);
  });

  test('should return 0 when total is 0', () => {
    expect(calculateHealthPercentage(0, 0)).toBe(0);
  });

  test('should round to nearest integer', () => {
    expect(calculateHealthPercentage(33, 100)).toBe(33);
    expect(calculateHealthPercentage(66, 100)).toBe(66);
    expect(calculateHealthPercentage(67, 100)).toBe(67);
  });

  test('should handle decimal results correctly', () => {
    expect(calculateHealthPercentage(1, 3)).toBe(33); // 33.333... -> 33
    expect(calculateHealthPercentage(2, 3)).toBe(67); // 66.666... -> 67
  });

  test('should return 100 for all successful executions', () => {
    expect(calculateHealthPercentage(50, 50)).toBe(100);
  });

  test('should return 0 for no successful executions', () => {
    expect(calculateHealthPercentage(0, 100)).toBe(0);
  });
});

describe('Utils - Get Health Badge Color', () => {
  test('should return green for health >= 90%', () => {
    expect(getHealthBadgeColor(90)).toBe('green');
    expect(getHealthBadgeColor(95)).toBe('green');
    expect(getHealthBadgeColor(100)).toBe('green');
  });

  test('should return yellow for health >= 70% and < 90%', () => {
    expect(getHealthBadgeColor(70)).toBe('yellow');
    expect(getHealthBadgeColor(80)).toBe('yellow');
    expect(getHealthBadgeColor(89)).toBe('yellow');
  });

  test('should return red for health < 70%', () => {
    expect(getHealthBadgeColor(0)).toBe('red');
    expect(getHealthBadgeColor(50)).toBe('red');
    expect(getHealthBadgeColor(69)).toBe('red');
  });

  test('should handle boundary values correctly', () => {
    expect(getHealthBadgeColor(89.9)).toBe('yellow');
    expect(getHealthBadgeColor(90)).toBe('green');
    expect(getHealthBadgeColor(69.9)).toBe('red');
    expect(getHealthBadgeColor(70)).toBe('yellow');
  });
});

describe('Utils - Format Date', () => {
  test('should format date to ISO string', () => {
    const date = new Date('2024-01-15T12:30:45.123Z');
    const formatted = formatDate(date);

    expect(formatted).toBe('2024-01-15T12:30:45.123Z');
  });

  test('should handle different dates', () => {
    const date1 = new Date('2023-12-31T23:59:59.999Z');
    const date2 = new Date('2024-01-01T00:00:00.000Z');

    expect(formatDate(date1)).toBe('2023-12-31T23:59:59.999Z');
    expect(formatDate(date2)).toBe('2024-01-01T00:00:00.000Z');
  });
});

describe('Utils - Parse Date', () => {
  test('should parse valid ISO date string', () => {
    const dateStr = '2024-01-15T12:30:45.123Z';
    const parsed = parseDate(dateStr);

    expect(parsed).toBeInstanceOf(Date);
    expect(parsed.toISOString()).toBe(dateStr);
  });

  test('should throw error for invalid date string', () => {
    expect(() => parseDate('invalid-date')).toThrow('Invalid date string');
    expect(() => parseDate('')).toThrow('Invalid date string');
    expect(() => parseDate('not a date')).toThrow('Invalid date string');
  });

  test('should parse different date formats', () => {
    const date1 = parseDate('2024-01-15');
    const date2 = parseDate('2024-01-15T12:30:45Z');

    expect(date1).toBeInstanceOf(Date);
    expect(date2).toBeInstanceOf(Date);
  });
});

describe('Utils - Create Build', () => {
  const selectors: Selector[] = [
    { type: 'tag', pattern: 'v*.*.*' },
  ];

  const buildData: Omit<Build, 'id' | 'createdAt' | 'updatedAt'> = {
    name: 'Test Build',
    organization: 'test-org',
    repository: 'test-repo',
    selectors,
    personalAccessToken: 'token123',
    cacheExpirationMinutes: 60,
  };

  test('should create a build with generated ID', () => {
    const build = createBuild(buildData);

    expect(build.id).toBeDefined();
    expect(build.id).toMatch(/^[0-9a-f]{32}$/);
  });

  test('should create a build with timestamps', () => {
    const before = new Date();
    const build = createBuild(buildData);
    const after = new Date();

    expect(build.createdAt).toBeInstanceOf(Date);
    expect(build.updatedAt).toBeInstanceOf(Date);
    expect(build.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(build.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    expect(build.updatedAt.getTime()).toBe(build.createdAt.getTime());
  });

  test('should preserve all build data', () => {
    const build = createBuild(buildData);

    expect(build.name).toBe(buildData.name);
    expect(build.organization).toBe(buildData.organization);
    expect(build.repository).toBe(buildData.repository);
    expect(build.selectors).toEqual(buildData.selectors);
    expect(build.personalAccessToken).toBe(buildData.personalAccessToken);
    expect(build.cacheExpirationMinutes).toBe(buildData.cacheExpirationMinutes);
  });

  test('should create different IDs for different builds', () => {
    const build1 = createBuild(buildData);
    const build2 = createBuild(buildData);

    expect(build1.id).not.toBe(build2.id);
  });
});

describe('Utils - Update Build Timestamp', () => {
  test('should update the updatedAt timestamp', () => {
    const originalDate = new Date('2024-01-01T00:00:00Z');
    const build: Build = {
      id: 'test-id',
      name: 'Test',
      organization: 'org',
      repository: 'repo',
      selectors: [{ type: 'tag', pattern: 'v*' }],
      personalAccessToken: 'token',
      cacheExpirationMinutes: 60,
      createdAt: originalDate,
      updatedAt: originalDate,
    };

    const updated = updateBuildTimestamp(build);

    expect(updated.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    expect(updated.createdAt).toEqual(originalDate);
  });

  test('should preserve all other build properties', () => {
    const build: Build = {
      id: 'test-id',
      name: 'Test',
      organization: 'org',
      repository: 'repo',
      selectors: [{ type: 'tag', pattern: 'v*' }],
      personalAccessToken: 'token',
      cacheExpirationMinutes: 60,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updated = updateBuildTimestamp(build);

    expect(updated.id).toBe(build.id);
    expect(updated.name).toBe(build.name);
    expect(updated.organization).toBe(build.organization);
    expect(updated.repository).toBe(build.repository);
    expect(updated.selectors).toEqual(build.selectors);
  });
});

describe('Utils - Has Stats', () => {
  test('should return true for valid stats', () => {
    const stats: BuildStats = {
      totalExecutions: 100,
      successfulExecutions: 80,
      failedExecutions: 20,
      healthPercentage: 80,
      lastTag: 'v1.0.0',
      last7DaysSuccesses: [],
      recentRuns: [],
      lastFetchedAt: new Date(),
      commitsLast7Days: 10,
      contributorsLast7Days: 3,
      lastCommit: {
        message: 'Test commit',
        date: new Date(),
        author: 'Test Author',
        sha: 'abc123',
        url: 'https://github.com/test/repo/commit/abc123',
      },
    };

    expect(hasStats(stats)).toBe(true);
  });

  test('should return false for null stats', () => {
    expect(hasStats(null)).toBe(false);
  });

  test('should work as type guard', () => {
    const statsOrNull: BuildStats | null = {
      totalExecutions: 100,
      successfulExecutions: 80,
      failedExecutions: 20,
      healthPercentage: 80,
      lastTag: 'v1.0.0',
      last7DaysSuccesses: [],
      recentRuns: [],
      lastFetchedAt: new Date(),
      commitsLast7Days: 10,
      contributorsLast7Days: 3,
      lastCommit: null,
    };

    if (hasStats(statsOrNull)) {
      // TypeScript should recognize stats as BuildStats here
      expect(statsOrNull.totalExecutions).toBeDefined();
    } else {
      expect(statsOrNull).toBeNull();
    }
  });
});

describe('Utils - Get Last N Days Range', () => {
  test('should return correct number of dates', () => {
    const dates = getLastNDaysRange(7);
    expect(dates.length).toBe(7);
  });

  test('should return dates in ascending order', () => {
    const dates = getLastNDaysRange(7);

    for (let i = 1; i < dates.length; i++) {
      const current = dates[i];
      const previous = dates[i - 1];
      if (current && previous) {
        expect(current.getTime()).toBeGreaterThan(previous.getTime());
      }
    }
  });

  test('should set time to midnight (00:00:00)', () => {
    const dates = getLastNDaysRange(7);

    dates.forEach(date => {
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
      expect(date.getMilliseconds()).toBe(0);
    });
  });

  test('should include today as the last date', () => {
    const dates = getLastNDaysRange(7);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastDate = dates[dates.length - 1];
    if (lastDate) {
      expect(lastDate.toDateString()).toBe(today.toDateString());
    }
  });

  test('should handle single day range', () => {
    const dates = getLastNDaysRange(1);
    expect(dates.length).toBe(1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDate = dates[0];
    if (firstDate) {
      expect(firstDate.toDateString()).toBe(today.toDateString());
    }
  });

  test('should handle 30 day range', () => {
    const dates = getLastNDaysRange(30);
    expect(dates.length).toBe(30);

    const firstDate = dates[0];
    const lastDate = dates[29];
    if (firstDate && lastDate) {
      const diffDays = Math.round(
        (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(29);
    }
  });
});

describe('Utils - Format Date YYYYMMDD', () => {
  test('should format date correctly', () => {
    const date = new Date('2024-01-15T12:30:45Z');
    expect(formatDateYYYYMMDD(date)).toBe('2024-01-15');
  });

  test('should pad single digit months and days', () => {
    const date = new Date('2024-03-05T00:00:00Z');
    expect(formatDateYYYYMMDD(date)).toBe('2024-03-05');
  });

  test('should handle end of year', () => {
    const date = new Date('2024-12-31T23:59:59Z');
    expect(formatDateYYYYMMDD(date)).toBe('2024-12-31');
  });

  test('should handle start of year', () => {
    const date = new Date('2024-01-01T00:00:00Z');
    expect(formatDateYYYYMMDD(date)).toBe('2024-01-01');
  });

  test('should format different dates uniquely', () => {
    const date1 = new Date('2024-01-15');
    const date2 = new Date('2024-02-15');
    const date3 = new Date('2025-01-15');

    expect(formatDateYYYYMMDD(date1)).toBe('2024-01-15');
    expect(formatDateYYYYMMDD(date2)).toBe('2024-02-15');
    expect(formatDateYYYYMMDD(date3)).toBe('2025-01-15');
  });
});

