import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';
import { GitHubGraphQLClient, GitHubAuthenticationError, GitHubAPIError } from '../GitHubGraphQLClient';

describe('GitHubGraphQLClient', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('constructor', () => {
    it('should create an instance with a token', () => {
      const client = new GitHubGraphQLClient('test-token');
      expect(client).toBeDefined();
    });
  });

  describe('validateToken', () => {
    it('should return true for a valid token', async () => {
      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: { viewer: { login: 'testuser' } } }),
        } as Response)
      ) as any;

      const client = new GitHubGraphQLClient('valid-token');
      const isValid = await client.validateToken();

      expect(isValid).toBe(true);
    });

    it('should return false for an invalid token', async () => {
      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        } as Response)
      ) as any;

      const client = new GitHubGraphQLClient('invalid-token');
      const isValid = await client.validateToken();

      expect(isValid).toBe(false);
    });

    it('should return false for authentication errors in response', async () => {
      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              errors: [{ message: 'Bad credentials', type: 'UNAUTHORIZED' }],
            }),
        } as Response)
      ) as any;

      const client = new GitHubGraphQLClient('invalid-token');
      const isValid = await client.validateToken();

      expect(isValid).toBe(false);
    });
  });

  describe('fetchWorkflowRuns', () => {
    it('should fetch workflow runs successfully', async () => {
      const mockRuns = {
        workflow_runs: [
          {
            id: 1,
            name: 'CI',
            status: 'completed',
            conclusion: 'success',
            html_url: 'https://github.com/owner/repo/actions/runs/1',
            created_at: '2024-01-01T10:00:00Z',
            updated_at: '2024-01-01T10:05:00Z',
            run_started_at: '2024-01-01T10:00:30Z',
          },
          {
            id: 2,
            name: 'CI',
            status: 'completed',
            conclusion: 'failure',
            html_url: 'https://github.com/owner/repo/actions/runs/2',
            created_at: '2024-01-01T11:00:00Z',
            updated_at: '2024-01-01T11:05:00Z',
            run_started_at: '2024-01-01T11:00:30Z',
          },
        ],
      };

      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockRuns),
        } as Response) as any
      );
      // @ts-ignore


      const client = new GitHubGraphQLClient('test-token');
      const runs = await client.fetchWorkflowRuns('owner', 'repo');

      expect(runs).toHaveLength(2);
      expect(runs[0]?.id).toBe(1);
      expect(runs[0]?.name).toBe('CI');
      expect(runs[0]?.status).toBe('success');
      expect(runs[0]?.duration).toBeDefined();
      expect(runs[1]?.status).toBe('failure');
    });

    it('should filter workflow runs by name', async () => {
      const mockRuns = {
        workflow_runs: [
          {
            id: 1,
            name: 'CI',
            status: 'completed',
            conclusion: 'success',
            html_url: 'https://github.com/owner/repo/actions/runs/1',
            created_at: '2024-01-01T10:00:00Z',
            updated_at: '2024-01-01T10:05:00Z',
          },
          {
            id: 2,
            name: 'Deploy',
            status: 'completed',
            conclusion: 'success',
            html_url: 'https://github.com/owner/repo/actions/runs/2',
            created_at: '2024-01-01T11:00:00Z',
            updated_at: '2024-01-01T11:05:00Z',
          },
        ],
      };

      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockRuns),
        } as Response) as any
      );
      // @ts-ignore


      const client = new GitHubGraphQLClient('test-token');
      const runs = await client.fetchWorkflowRuns('owner', 'repo', { workflowName: 'CI' });

      expect(runs).toHaveLength(1);
      expect(runs[0]?.name).toBe('CI');
    });

    it('should filter workflow runs by date', async () => {
      const mockRuns = {
        workflow_runs: [
          {
            id: 1,
            name: 'CI',
            status: 'completed',
            conclusion: 'success',
            html_url: 'https://github.com/owner/repo/actions/runs/1',
            created_at: '2024-01-05T10:00:00Z',
            updated_at: '2024-01-05T10:05:00Z',
          },
          {
            id: 2,
            name: 'CI',
            status: 'completed',
            conclusion: 'success',
            html_url: 'https://github.com/owner/repo/actions/runs/2',
            created_at: '2024-01-01T11:00:00Z',
            updated_at: '2024-01-01T11:05:00Z',
          },
        ],
      };

      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockRuns),
        } as Response) as any
      );
      // @ts-ignore


      const client = new GitHubGraphQLClient('test-token');
      const runs = await client.fetchWorkflowRuns('owner', 'repo', {
        since: new Date('2024-01-03T00:00:00Z'),
      });

      expect(runs).toHaveLength(1);
      expect(runs[0]?.id).toBe(1);
    });

    it('should throw GitHubAuthenticationError for 401 status', async () => {
      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        } as Response) as any
      );
      // @ts-ignore


      const client = new GitHubGraphQLClient('invalid-token');

      await expect(client.fetchWorkflowRuns('owner', 'repo')).rejects.toThrow(
        GitHubAuthenticationError
      );
    });

    it('should map workflow run statuses correctly', async () => {
      const mockRuns = {
        workflow_runs: [
          {
            id: 1,
            name: 'CI',
            status: 'completed',
            conclusion: 'success',
            html_url: 'https://github.com/owner/repo/actions/runs/1',
            created_at: '2024-01-01T10:00:00Z',
            updated_at: '2024-01-01T10:05:00Z',
          },
          {
            id: 2,
            name: 'CI',
            status: 'completed',
            conclusion: 'cancelled',
            html_url: 'https://github.com/owner/repo/actions/runs/2',
            created_at: '2024-01-01T11:00:00Z',
            updated_at: '2024-01-01T11:05:00Z',
          },
          {
            id: 3,
            name: 'CI',
            status: 'in_progress',
            conclusion: null,
            html_url: 'https://github.com/owner/repo/actions/runs/3',
            created_at: '2024-01-01T12:00:00Z',
            updated_at: '2024-01-01T12:05:00Z',
          },
          {
            id: 4,
            name: 'CI',
            status: 'queued',
            conclusion: null,
            html_url: 'https://github.com/owner/repo/actions/runs/4',
            created_at: '2024-01-01T13:00:00Z',
            updated_at: '2024-01-01T13:00:00Z',
          },
        ],
      };

      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockRuns),
        } as Response) as any
      );
      // @ts-ignore


      const client = new GitHubGraphQLClient('test-token');
      const runs = await client.fetchWorkflowRuns('owner', 'repo');

      expect(runs).toHaveLength(4);
      expect(runs[0]?.status).toBe('success');
      expect(runs[1]?.status).toBe('cancelled');
      expect(runs[2]?.status).toBe('in_progress');
      expect(runs[3]?.status).toBe('queued');
    });
  });

  describe('fetchTags', () => {
    it('should fetch tags successfully', async () => {
      const mockData = {
        data: {
          repository: {
            refs: {
              nodes: [
                { name: 'v1.2.0', target: { committedDate: '2024-01-05T10:00:00Z' } },
                { name: 'v1.1.0', target: { committedDate: '2024-01-01T10:00:00Z' } },
              ],
            },
          },
        },
      };

      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockData),
        } as Response) as any
      );
      // @ts-ignore


      const client = new GitHubGraphQLClient('test-token');
      const tags = await client.fetchTags('owner', 'repo');

      expect(tags).toHaveLength(2);
      expect(tags[0]).toBe('v1.2.0');
      expect(tags[1]).toBe('v1.1.0');
    });

    it('should return empty array when no tags exist', async () => {
      const mockData = {
        data: {
          repository: {
            refs: {
              nodes: [],
            },
          },
        },
      };

      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockData),
        } as Response) as any
      );
      // @ts-ignore


      const client = new GitHubGraphQLClient('test-token');
      const tags = await client.fetchTags('owner', 'repo');

      expect(tags).toEqual([]);
    });

    it('should throw GitHubAuthenticationError for 401 status', async () => {
      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        } as Response) as any
      );
      // @ts-ignore


      const client = new GitHubGraphQLClient('invalid-token');

      await expect(client.fetchTags('owner', 'repo')).rejects.toThrow(GitHubAuthenticationError);
    });
  });

  describe('fetchLatestTag', () => {
    it('should fetch the latest tag', async () => {
      const mockData = {
        data: {
          repository: {
            refs: {
              nodes: [{ name: 'v1.2.0', target: { committedDate: '2024-01-05T10:00:00Z' } }],
            },
          },
        },
      };

      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockData),
        } as Response) as any
      );
      // @ts-ignore


      const client = new GitHubGraphQLClient('test-token');
      const tag = await client.fetchLatestTag('owner', 'repo');

      expect(tag).toBe('v1.2.0');
    });

    it('should return null when no tags exist', async () => {
      const mockData = {
        data: {
          repository: {
            refs: {
              nodes: [],
            },
          },
        },
      };

      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockData),
        } as Response) as any
      );
      // @ts-ignore


      const client = new GitHubGraphQLClient('test-token');
      const tag = await client.fetchLatestTag('owner', 'repo');

      expect(tag).toBeNull();
    });
  });

  describe('fetchWorkflows', () => {
    it('should fetch workflows successfully', async () => {
      const mockData = {
        workflows: [
          { name: 'CI', path: '.github/workflows/ci.yml', state: 'active' },
          { name: 'Deploy', path: '.github/workflows/deploy.yml', state: 'active' },
        ],
      };

      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockData),
        } as Response) as any
      );
      // @ts-ignore


      const client = new GitHubGraphQLClient('test-token');
      const workflows = await client.fetchWorkflows('owner', 'repo');

      expect(workflows).toHaveLength(2);
      expect(workflows[0]?.name).toBe('CI');
      expect(workflows[0]?.path).toBe('.github/workflows/ci.yml');
      expect(workflows[0]?.state).toBe('active');
    });

    it('should return empty array when no workflows exist', async () => {
      const mockData = {
        workflows: [],
      };

      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockData),
        } as Response) as any
      );
      // @ts-ignore


      const client = new GitHubGraphQLClient('test-token');
      const workflows = await client.fetchWorkflows('owner', 'repo');

      expect(workflows).toEqual([]);
    });

    it('should throw GitHubAuthenticationError for 401 status', async () => {
      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        } as Response) as any
      );
      // @ts-ignore


      const client = new GitHubGraphQLClient('invalid-token');

      await expect(client.fetchWorkflows('owner', 'repo')).rejects.toThrow(
        GitHubAuthenticationError
      );
    });

    it('should throw GitHubAPIError for non-401 errors', async () => {
      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response) as any
      );
      // @ts-ignore


      const client = new GitHubGraphQLClient('test-token');

      await expect(client.fetchWorkflows('owner', 'repo')).rejects.toThrow(GitHubAPIError);
    });
  });

  describe('error handling', () => {
    it('should throw GitHubAPIError for GraphQL errors', async () => {
      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              errors: [{ message: 'Could not resolve to a Repository' }],
            }),
        } as Response) as any
      );
      // @ts-ignore


      const client = new GitHubGraphQLClient('test-token');

      await expect(client.fetchTags('owner', 'invalid-repo')).rejects.toThrow(GitHubAPIError);
    });

    it('should throw GitHubAPIError when no data is returned', async () => {
      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({}),
        } as Response) as any
      );
      // @ts-ignore


      const client = new GitHubGraphQLClient('test-token');

      await expect(client.fetchTags('owner', 'repo')).rejects.toThrow(GitHubAPIError);
    });

    it('should include status code in GitHubAPIError', async () => {
      // @ts-ignore - Mock fetch
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        } as Response) as any
      );
      // @ts-ignore


      const client = new GitHubGraphQLClient('test-token');

      try {
        await client.fetchTags('owner', 'repo');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(GitHubAPIError);
        expect((error as GitHubAPIError).statusCode).toBe(500);
      }
    });
  });
});

