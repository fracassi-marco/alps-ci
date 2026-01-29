import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { BuildListView } from '../../app/components/BuildListView';
import type { Build, BuildStats } from '../../src/domain/models';

// Mock useRouter from next/navigation
const mockPush = mock(() => {});
const mockRouter = {
  push: mockPush,
  replace: mock(() => {}),
  back: mock(() => {}),
  forward: mock(() => {}),
  refresh: mock(() => {}),
  prefetch: mock(() => {}),
};

// Mock next/navigation module
mock.module('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock fetch globally
const mockFetch = mock(() => Promise.resolve({
  ok: true,
  status: 200,
  json: async () => ({}),
}));

global.fetch = mockFetch as any;

describe('BuildListView', () => {
  const mockBuild1: Build = {
    id: 'build-1',
    tenantId: 'tenant-123',
    name: 'Frontend Build',
    organization: 'test-org',
    repository: 'frontend-repo',
    selectors: [
      { type: 'branch', pattern: 'main' },
    ],
    personalAccessToken: 'test-token-1',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    accessTokenId: 'ignore',
  };

  const mockBuild2: Build = {
    id: 'build-2',
    tenantId: 'tenant-123',
    name: 'Backend Build',
    organization: 'test-org',
    repository: 'backend-repo',
    selectors: [
      { type: 'tag', pattern: 'v*' },
    ],
    personalAccessToken: 'test-token-2',
    createdAt: new Date('2025-01-02T00:00:00Z'),
    updatedAt: new Date('2025-01-02T00:00:00Z'),
    accessTokenId: 'ignore',
  };

  const mockStats1: BuildStats = {
    totalExecutions: 15,
    successfulExecutions: 14,
    failedExecutions: 1,
    healthPercentage: 93.33,
    lastTag: 'v1.2.3',
    last7DaysSuccesses: [
      { date: '2025-01-01', successCount: 7, failureCount: 0 },
      { date: '2025-01-02', successCount: 7, failureCount: 1 },
    ],
    recentRuns: [
      {
        id: 12345,
        name: 'CI Pipeline',
        status: 'success',
        conclusion: 'success',
        htmlUrl: 'https://github.com/test-org/frontend-repo/actions/runs/12345',
        createdAt: new Date('2025-01-03T10:00:00Z'),
        updatedAt: new Date('2025-01-03T10:15:00Z'),
        duration: 900000,
      },
    ],
    lastFetchedAt: new Date('2025-01-03T12:00:00Z'),
    commitsLast7Days: 20,
    contributorsLast7Days: 4,
    lastCommit: {
      message: 'Update feature',
      date: new Date('2025-01-03T09:00:00Z'),
      author: 'Alice',
      sha: 'abc123',
      url: 'https://github.com/test-org/frontend-repo/commit/abc123',
    },
    totalCommits: 500,
    totalContributors: 25,
    testStats: null,
  };

  const mockStats2: BuildStats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    healthPercentage: 0,
    lastTag: null,
    last7DaysSuccesses: [],
    recentRuns: [],
    lastFetchedAt: new Date('2025-01-03T12:00:00Z'),
    commitsLast7Days: 0,
    contributorsLast7Days: 0,
    lastCommit: null,
    totalCommits: 0,
    totalContributors: 0,
    testStats: null,
  };

  const mockOnRefresh = mock(() => {});
  const mockOnEdit = mock(() => {});
  const mockOnDelete = mock(() => {});

  beforeEach(() => {
    // Clear all mocks to prevent state pollution between tests
    mockFetch.mockClear();
    mockOnRefresh.mockClear();
    mockOnEdit.mockClear();
    mockOnDelete.mockClear();

    // Reset mock implementations
    mockFetch.mockImplementation(() => Promise.resolve({
      ok: true,
      status: 200,
      json: async () => ({}),
    }));
  });

  afterEach(() => {
    cleanup();
    mockFetch.mockClear();
  });

  test('should render builds in table format', async () => {
    mockFetch.mockImplementation(((url: string) => {
      if (url.includes('build-1')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockStats1,
        });
      }
      if (url.includes('build-2')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockStats2,
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
    }) as any);

    render(
      <BuildListView
        builds={[mockBuild1, mockBuild2]}
        onRefresh={mockOnRefresh}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Wait for builds to render
    await waitFor(() => {
      expect(screen.getByText('Frontend Build')).toBeDefined();
      expect(screen.getByText('Backend Build')).toBeDefined();
    });

    // Check for group header "Unlabeled" since builds have no labels
    expect(screen.getByText('Unlabeled')).toBeDefined();

    // Check table headers exist
    expect(screen.getByText('Name')).toBeDefined();
    expect(screen.getByText('Health')).toBeDefined();
    expect(screen.getByText('7-Day Stats')).toBeDefined();
    expect(screen.getByText('Last Tag')).toBeDefined();
    expect(screen.getByText('Last Run')).toBeDefined();
    expect(screen.getByText('Actions')).toBeDefined();

    // Check org/repo links
    expect(screen.getByText('test-org/frontend-repo')).toBeDefined();
    expect(screen.getByText('test-org/backend-repo')).toBeDefined();
  });

  test('should display health badge for builds with executions', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats1,
      })
    );

    render(
      <BuildListView
        builds={[mockBuild1]}
        onRefresh={mockOnRefresh}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('93%')).toBeDefined();
    });
  });

  test('should display "Inactive" label for builds with zero executions', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats2,
      })
    );

    render(
      <BuildListView
        builds={[mockBuild2]}
        onRefresh={mockOnRefresh}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Inactive')).toBeDefined();
    });
  });

  test('should display 7-day stats in compact format', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats1,
      })
    );

    render(
      <BuildListView
        builds={[mockBuild1]}
        onRefresh={mockOnRefresh}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    await waitFor(() => {
      const statsElements = screen.getAllByText('15 / 14 / 1');
      expect(statsElements.length).toBeGreaterThan(0);
    });
  });

  test('should display last tag when available', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats1,
      })
    );

    render(
      <BuildListView
        builds={[mockBuild1]}
        onRefresh={mockOnRefresh}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    await waitFor(() => {
      const tagElements = screen.getAllByText('v1.2.3');
      expect(tagElements.length).toBeGreaterThan(0);
    });
  });

  test('should display "—" when last tag is not available', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats2,
      })
    );

    render(
      <BuildListView
        builds={[mockBuild2]}
        onRefresh={mockOnRefresh}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    await waitFor(() => {
      const cells = screen.getAllByText('—');
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  test('should handle empty builds array', () => {
    const { container } = render(
      <BuildListView
        builds={[]}
        onRefresh={mockOnRefresh}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Should render empty container with space-y-8 class
    expect(container.querySelector('.space-y-8')).toBeDefined();
    // Should not have any build groups
    expect(container.querySelectorAll('table').length).toBe(0);
  });

  test('should call onEdit when edit button is clicked', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats1,
      })
    );

    render(
      <BuildListView
        builds={[mockBuild1]}
        onRefresh={mockOnRefresh}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    await waitFor(() => {
      const buildElements = screen.getAllByText('Frontend Build');
      expect(buildElements.length).toBeGreaterThan(0);
    });

    const editButtons = screen.getAllByTitle('Edit build');
    fireEvent.click(editButtons[0]!);

    expect(mockOnEdit).toHaveBeenCalledTimes(1);
    expect(mockOnEdit).toHaveBeenCalledWith(mockBuild1);
  });

  test('should show confirmation dialog when delete button is clicked', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats1,
      })
    );

    render(
      <BuildListView
        builds={[mockBuild1]}
        onRefresh={mockOnRefresh}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    await waitFor(() => {
      const buildElements = screen.getAllByText('Frontend Build');
      expect(buildElements.length).toBeGreaterThan(0);
    });

    const deleteButtons = screen.getAllByTitle('Delete build');
    fireEvent.click(deleteButtons[0]!);

    // Check confirmation dialog appears
    await waitFor(() => {
      expect(screen.getByText('Delete Build?')).toBeDefined();
      expect(screen.getByText(/Are you sure you want to delete/)).toBeDefined();
    });

    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  test('should call onDelete when delete is confirmed', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats1,
      })
    );

    render(
      <BuildListView
        builds={[mockBuild1]}
        onRefresh={mockOnRefresh}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    await waitFor(() => {
      const buildElements = screen.getAllByText('Frontend Build');
      expect(buildElements.length).toBeGreaterThan(0);
    });

    const deleteButtons = screen.getAllByTitle('Delete build');
    fireEvent.click(deleteButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText('Delete Build?')).toBeDefined();
    });

    const confirmButton = screen.getByText('Delete');
    fireEvent.click(confirmButton);

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
    expect(mockOnDelete).toHaveBeenCalledWith(mockBuild1);
  });

  test('should not call onDelete when delete is cancelled', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats1,
      })
    );

    render(
      <BuildListView
        builds={[mockBuild1]}
        onRefresh={mockOnRefresh}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    await waitFor(() => {
      const buildElements = screen.getAllByText('Frontend Build');
      expect(buildElements.length).toBeGreaterThan(0);
    });

    const deleteButtons = screen.getAllByTitle('Delete build');
    fireEvent.click(deleteButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText('Delete Build?')).toBeDefined();
    });

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  test('should call onRefresh when refresh button is clicked', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats1,
      })
    );

    render(
      <BuildListView
        builds={[mockBuild1]}
        onRefresh={mockOnRefresh}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    await waitFor(() => {
      const buildElements = screen.getAllByText('Frontend Build');
      expect(buildElements.length).toBeGreaterThan(0);
    });

    const refreshButtons = screen.getAllByTitle('Refresh data');
    fireEvent.click(refreshButtons[0]!);

    await waitFor(() => {
      expect(mockOnRefresh).toHaveBeenCalledTimes(1);
      expect(mockOnRefresh).toHaveBeenCalledWith(mockBuild1);
    });
  });

  test('should display loading state while fetching stats', () => {
    mockFetch.mockImplementation(() =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            status: 200,
            json: async () => mockStats1,
          });
        }, 100);
      })
    );

    render(
      <BuildListView
        builds={[mockBuild1]}
        onRefresh={mockOnRefresh}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    // Check for loading skeletons
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  test('should display error state when PAT is invalid', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid Personal Access Token' }),
      })
    );

    render(
      <BuildListView
        builds={[mockBuild1]}
        onRefresh={mockOnRefresh}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Token error')).toBeDefined();
    });
  });

  test('should display error state when stats fetch fails', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: async () => ({}),
      })
    );

    render(
      <BuildListView
        builds={[mockBuild1]}
        onRefresh={mockOnRefresh}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Token error')).toBeDefined();
    });
  });

  test('should show loading spinner on refresh button while refreshing', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats1,
      })
    );

    render(
      <BuildListView
        builds={[mockBuild1]}
        onRefresh={mockOnRefresh}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    await waitFor(() => {
      const buildElements = screen.getAllByText('Frontend Build');
      expect(buildElements.length).toBeGreaterThan(0);
    });

    mockFetch.mockImplementation(() =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            status: 200,
            json: async () => mockStats1,
          });
        }, 100);
      })
    );

    const refreshButtons = screen.getAllByTitle('Refresh data');
    fireEvent.click(refreshButtons[0]!);

    // Check for spinning animation
    const refreshIcons = document.querySelectorAll('.animate-spin');
    expect(refreshIcons.length).toBeGreaterThan(0);
  });

  test('should open GitHub repository in new tab when org/repo link is clicked', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => mockStats1,
      })
    );

    render(
      <BuildListView
        builds={[mockBuild1]}
        onRefresh={mockOnRefresh}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
      />
    );

    await waitFor(() => {
      const buildElements = screen.getAllByText('Frontend Build');
      expect(buildElements.length).toBeGreaterThan(0);
    });

    const repoLinks = screen.getAllByText('test-org/frontend-repo');
    const repoLink = repoLinks[0]!;
    expect(repoLink.closest('a')?.getAttribute('href')).toBe(
      'https://github.com/test-org/frontend-repo'
    );
    expect(repoLink.closest('a')?.getAttribute('target')).toBe('_blank');
    expect(repoLink.closest('a')?.getAttribute('rel')).toBe('noopener noreferrer');
  });
});

