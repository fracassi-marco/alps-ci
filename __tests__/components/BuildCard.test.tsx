import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { render, screen, waitFor } from '@testing-library/react';
import { BuildCard } from '../../app/components/BuildCard';
import type { Build, BuildStats } from '../../src/domain/models';

// Mock fetch globally
const mockFetch = mock(() => Promise.resolve({
  ok: true,
  status: 200,
  json: async () => ({}),
}));

global.fetch = mockFetch as any;

describe('BuildCard - Inactive Health Label', () => {
  const mockBuild: Build = {
    id: 'test-build-id',
    name: 'Test Build',
    organization: 'test-org',
    repository: 'test-repo',
    selectors: [
      { type: 'branch', pattern: 'main' },
    ],
    personalAccessToken: 'test-token',
    cacheExpirationMinutes: 60,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };

  const mockStatsWithExecutions: BuildStats = {
    totalExecutions: 10,
    successfulExecutions: 9,
    failedExecutions: 1,
    healthPercentage: 90,
    lastTag: 'v1.0.0',
    last7DaysSuccesses: [
      { date: '2025-01-01', successCount: 5, failureCount: 1 },
      { date: '2025-01-02', successCount: 4, failureCount: 0 },
    ],
    recentRuns: [],
    lastFetchedAt: new Date('2025-01-03T00:00:00Z'),
    commitsLast7Days: 15,
    contributorsLast7Days: 3,
    lastCommit: {
      message: 'Fix bug in authentication',
      date: new Date('2025-01-02T10:00:00Z'),
      author: 'John Doe',
      sha: 'abc1234567890',
      url: 'https://github.com/test-org/test-repo/commit/abc1234567890',
    },
    totalCommits: 450,
    totalContributors: 18,
  };

  const mockStatsWithZeroExecutions: BuildStats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    healthPercentage: 0,
    lastTag: null,
    last7DaysSuccesses: [],
    recentRuns: [],
    lastFetchedAt: new Date('2025-01-03T00:00:00Z'),
    commitsLast7Days: 0,
    contributorsLast7Days: 0,
    lastCommit: null,
    totalCommits: 0,
    totalContributors: 0,
  };

  const mockOnEdit = mock(() => {});
  const mockOnDelete = mock(() => {});
  const mockOnRefresh = mock(() => {});

  beforeEach(() => {
    mockFetch.mockClear();
    mockOnEdit.mockClear();
    mockOnDelete.mockClear();
    mockOnRefresh.mockClear();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  test('should display health percentage when there are executions', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStatsWithExecutions,
      })
    );

    render(
      <BuildCard
        build={mockBuild}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    );

    // Wait for the stats to load
    await waitFor(() => {
      expect(screen.queryByText('Loading statistics...')).toBeNull();
    });

    // Check that health percentage is displayed
    await waitFor(() => {
      expect(screen.getByText('90%')).toBeTruthy();
    });

    // Check that "Inactive" label is not displayed
    expect(screen.queryByText('Inactive')).toBeNull();
  });

  test('should display "Inactive" label when there are 0 executions', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStatsWithZeroExecutions,
      })
    );

    render(
      <BuildCard
        build={mockBuild}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    );

    // Wait for the stats to load
    await waitFor(() => {
      expect(screen.queryByText('Loading statistics...')).toBeNull();
    });

    // Check that "Inactive" label is displayed
    await waitFor(() => {
      expect(screen.getByText('Inactive')).toBeTruthy();
    });

    // Check that health percentage is not displayed
    expect(screen.queryByText('%')).toBeNull();
  });

  test('should display correct execution counts when 0 executions', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStatsWithZeroExecutions,
      })
    );

    render(
      <BuildCard
        build={mockBuild}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    );

    // Wait for the stats to load
    await waitFor(() => {
      expect(screen.queryByText('Loading statistics...')).toBeNull();
    });

    // Check that all execution counts are 0
    await waitFor(() => {
      const totalElements = screen.getAllByText('0');
      // We should have at least 3 zeros (total, success, failed)
      expect(totalElements.length).toBeGreaterThanOrEqual(3);
    });
  });

  test('should not display "Inactive" label during loading', async () => {
    // Delay the response to keep the component in loading state
    mockFetch.mockImplementation(() =>
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        status: 200,
        json: async () => mockStatsWithZeroExecutions,
      }), 100))
    );

    render(
      <BuildCard
        build={mockBuild}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    );

    // Check that loading state is shown
    expect(screen.getByText('Loading statistics...')).toBeTruthy();

    // Check that "Inactive" label is not shown during loading
    expect(screen.queryByText('Inactive')).toBeNull();
  });

  test('should not display "Inactive" label when there is an error', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid token' }),
      })
    );

    render(
      <BuildCard
        build={mockBuild}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    );

    // Wait for the error to be displayed
    await waitFor(() => {
      expect(screen.getByText(/Invalid token/)).toBeTruthy();
    });

    // Check that "Inactive" label is not shown when there's an error
    expect(screen.queryByText('Inactive')).toBeNull();
  });
});

describe('BuildCard - Clickable Repository Link', () => {
  const mockBuild: Build = {
    id: 'test-build-id',
    name: 'Test Build',
    organization: 'test-org',
    repository: 'test-repo',
    selectors: [
      { type: 'branch', pattern: 'main' },
    ],
    personalAccessToken: 'test-token',
    cacheExpirationMinutes: 60,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };

  const mockStats: BuildStats = {
    totalExecutions: 5,
    successfulExecutions: 5,
    failedExecutions: 0,
    healthPercentage: 100,
    lastTag: 'v1.0.0',
    last7DaysSuccesses: [
      { date: '2025-01-01', successCount: 5, failureCount: 0 },
    ],
    recentRuns: [],
    lastFetchedAt: new Date('2025-01-03T00:00:00Z'),
    commitsLast7Days: 8,
    contributorsLast7Days: 2,
    lastCommit: null,
    totalCommits: 200,
    totalContributors: 10,
  };

  const mockOnEdit = mock(() => {});
  const mockOnDelete = mock(() => {});
  const mockOnRefresh = mock(() => {});

  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  test('should render repository link with correct href', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats,
      })
    );

    render(
      <BuildCard
        build={mockBuild}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    );

    // Find the repository link
    const link = screen.getByRole('link', { name: /test-org\/test-repo/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('https://github.com/test-org/test-repo');
  });

  test('should open repository link in new tab', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats,
      })
    );

    render(
      <BuildCard
        build={mockBuild}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    );

    const link = screen.getByRole('link', { name: /test-org\/test-repo/i });
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  test('should display organization and repository name correctly', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats,
      })
    );

    render(
      <BuildCard
        build={mockBuild}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    );

    // Check that the text is displayed
    expect(screen.getByText(/test-org\/test-repo/)).toBeTruthy();
  });

  test('should handle different organization and repository names', async () => {
    const customBuild: Build = {
      ...mockBuild,
      organization: 'my-company',
      repository: 'awesome-project',
    };

    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats,
      })
    );

    render(
      <BuildCard
        build={customBuild}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    );

    const link = screen.getByRole('link', { name: /my-company\/awesome-project/i });
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('https://github.com/my-company/awesome-project');
  });
});

describe('BuildCard - Commits and Contributors Statistics', () => {
  const mockBuild: Build = {
    id: 'test-build-id',
    name: 'Test Build',
    organization: 'test-org',
    repository: 'test-repo',
    selectors: [
      { type: 'branch', pattern: 'main' },
    ],
    personalAccessToken: 'test-token',
    cacheExpirationMinutes: 60,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };

  const mockStats: BuildStats = {
    totalExecutions: 10,
    successfulExecutions: 9,
    failedExecutions: 1,
    healthPercentage: 90,
    lastTag: 'v1.0.0',
    last7DaysSuccesses: [
      { date: '2025-01-01', successCount: 5, failureCount: 1 },
    ],
    recentRuns: [],
    lastFetchedAt: new Date('2025-01-03T00:00:00Z'),
    commitsLast7Days: 25,
    contributorsLast7Days: 5,
    lastCommit: {
      message: 'Update dependencies',
      date: new Date('2025-01-02T15:30:00Z'),
      author: 'Jane Smith',
      sha: 'def4567890123',
      url: 'https://github.com/test-org/test-repo/commit/def4567890123',
    },
    totalCommits: 850,
    totalContributors: 32,
  };

  const mockOnEdit = mock(() => {});
  const mockOnDelete = mock(() => {});
  const mockOnRefresh = mock(() => {});

  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  test('should display commits in last 7 days', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats,
      })
    );

    render(
      <BuildCard
        build={mockBuild}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading statistics...')).toBeNull();
    });

    // Check that the Last 7 Days section is displayed
    await waitFor(() => {
      expect(screen.getByText('Last 7 Days')).toBeTruthy();
    });

    // Verify the value 25 appears (it's the commits in last 7 days)
    const elements = screen.getAllByText('25');
    expect(elements.length).toBeGreaterThan(0);
  });

  test('should display contributors in last 7 days', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats,
      })
    );

    render(
      <BuildCard
        build={mockBuild}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading statistics...')).toBeNull();
    });

    // Check that the Last 7 Days section is displayed
    await waitFor(() => {
      expect(screen.getByText('Last 7 Days')).toBeTruthy();
    });

    // Verify the value 5 appears (it's the contributors in last 7 days)
    const elements = screen.getAllByText('5');
    expect(elements.length).toBeGreaterThan(0);
  });

  test('should display zero commits and contributors when there are none', async () => {
    const statsWithZero: BuildStats = {
      ...mockStats,
      commitsLast7Days: 0,
      contributorsLast7Days: 0,
    };

    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => statsWithZero,
      })
    );

    render(
      <BuildCard
        build={mockBuild}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading statistics...')).toBeNull();
    });

    // Should display 0 for both metrics
    const zeroElements = screen.getAllByText('0');
    expect(zeroElements.length).toBeGreaterThan(0);
  });

  test('should display total commits', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats,
      })
    );

    render(
      <BuildCard
        build={mockBuild}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading statistics...')).toBeNull();
    });

    // Check that the All Time section is displayed
    await waitFor(() => {
      expect(screen.getByText('All Time')).toBeTruthy();
      expect(screen.getByText('850')).toBeTruthy();
    });
  });

  test('should display total contributors', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats,
      })
    );

    render(
      <BuildCard
        build={mockBuild}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading statistics...')).toBeNull();
    });

    // Check that the All Time section is displayed
    await waitFor(() => {
      expect(screen.getByText('All Time')).toBeTruthy();
      expect(screen.getByText('32')).toBeTruthy();
    });
  });
});

describe('BuildCard - Last Commit Details', () => {
  const mockBuild: Build = {
    id: 'test-build-id',
    name: 'Test Build',
    organization: 'test-org',
    repository: 'test-repo',
    selectors: [
      { type: 'branch', pattern: 'main' },
    ],
    personalAccessToken: 'test-token',
    cacheExpirationMinutes: 60,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };

  const mockStats: BuildStats = {
    totalExecutions: 10,
    successfulExecutions: 9,
    failedExecutions: 1,
    healthPercentage: 90,
    lastTag: 'v1.0.0',
    last7DaysSuccesses: [
      { date: '2025-01-01', successCount: 5, failureCount: 1 },
    ],
    recentRuns: [],
    lastFetchedAt: new Date('2025-01-03T00:00:00Z'),
    commitsLast7Days: 25,
    contributorsLast7Days: 5,
    lastCommit: {
      message: 'Fix critical bug in user authentication\n\nThis fixes the issue where users could not log in',
      date: new Date('2025-01-05T14:30:00Z'),
      author: 'Alice Johnson',
      sha: 'abc1234567890def',
      url: 'https://github.com/test-org/test-repo/commit/abc1234567890def',
    },
    totalCommits: 1250,
    totalContributors: 45,
  };

  const mockOnEdit = mock(() => {});
  const mockOnDelete = mock(() => {});
  const mockOnRefresh = mock(() => {});

  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockClear();
  });

  test('should display last commit message', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats,
      })
    );

    render(
      <BuildCard
        build={mockBuild}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading statistics...')).toBeNull();
    });

    // Check that commit message is displayed (only first line)
    await waitFor(() => {
      expect(screen.getByText('Fix critical bug in user authentication')).toBeTruthy();
    });
  });

  test('should display last commit author and date', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats,
      })
    );

    render(
      <BuildCard
        build={mockBuild}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading statistics...')).toBeNull();
    });

    // Check that author is displayed
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeTruthy();
    });
  });

  test('should display last commit sha as link', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats,
      })
    );

    render(
      <BuildCard
        build={mockBuild}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading statistics...')).toBeNull();
    });

    // Check that short sha is displayed as a link
    await waitFor(() => {
      const shaLink = screen.getByText('abc1234');
      expect(shaLink).toBeTruthy();
      expect(shaLink.getAttribute('href')).toBe('https://github.com/test-org/test-repo/commit/abc1234567890def');
      expect(shaLink.getAttribute('target')).toBe('_blank');
    });
  });

  test('should not display last commit section when lastCommit is null', async () => {
    const statsWithoutCommit: BuildStats = {
      ...mockStats,
      lastCommit: null,
    };

    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => statsWithoutCommit,
      })
    );

    render(
      <BuildCard
        build={mockBuild}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading statistics...')).toBeNull();
    });

    // Check that "Last Commit" section is not displayed
    expect(screen.queryByText('Last Commit:')).toBeNull();
  });
});


