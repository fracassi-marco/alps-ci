import type { WorkflowRun, WorkflowRunStatus } from '../domain/models';
import AdmZip from 'adm-zip';

export class GitHubAuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitHubAuthenticationError';
  }
}

export class GitHubAPIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'GitHubAPIError';
  }
}

interface GitHubGraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    type?: string;
  }>;
}

interface WorkflowRunNode {
  databaseId: number;
  name: string;
  status: string;
  conclusion: string | null;
  url: string;
  createdAt: string;
  updatedAt: string;
  runStartedAt: string | null;
}

interface TagNode {
  name: string;
  target: {
    oid: string;
    committedDate?: string;
  };
}

interface WorkflowNode {
  name: string;
  path: string;
  state: string;
}

export class GitHubGraphQLClient {
  private readonly baseUrl = 'https://api.github.com/graphql';
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async query<T>(query: string, variables?: Record<string, any>): Promise<T> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Alps-CI',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (response.status === 401) {
      throw new GitHubAuthenticationError('Invalid or expired Personal Access Token');
    }

    if (!response.ok) {
      throw new GitHubAPIError(
        `GitHub API request failed: ${response.statusText}`,
        response.status
      );
    }

    const result: GitHubGraphQLResponse<T> = await response.json();

    if (result.errors && result.errors.length > 0) {
      const errorMessage = result.errors.map((e) => e.message).join(', ');

      // Check for authentication errors in the response
      if (result.errors.some((e) => e.type === 'UNAUTHORIZED' || e.message.includes('authentication'))) {
        throw new GitHubAuthenticationError(errorMessage);
      }

      throw new GitHubAPIError(errorMessage);
    }

    if (!result.data) {
      throw new GitHubAPIError('No data returned from GitHub API');
    }

    return result.data;
  }

  async fetchWorkflowRuns(
    owner: string,
    repo: string,
    filters?: {
      workflowName?: string;
      branch?: string;
      limit?: number;
      since?: Date;
      delayMs?: number;
    }
  ): Promise<WorkflowRun[]> {
    return this.fetchWorkflowRunsREST(owner, repo, filters);
  }

  private async fetchWorkflowRunsREST(
    owner: string,
    repo: string,
    filters?: {
      workflowName?: string;
      branch?: string;
      limit?: number;
      since?: Date;
      delayMs?: number;
    }
  ): Promise<WorkflowRun[]> {
    console.log(`[GitHub] fetching workflow runs for ${owner}/${repo}${filters?.limit === undefined ? ' (unlimited)' : ` (limit: ${filters.limit})`}`);
    const limit = filters?.limit;
    const perPage = 100; // GitHub API max per page
    const delayMs = filters?.delayMs || 0;

    let allRuns: any[] = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      let url = `https://api.github.com/repos/${owner}/${repo}/actions/runs?per_page=${perPage}&page=${page}`;

      if (filters?.branch) {
        url += `&branch=${encodeURIComponent(filters.branch)}`;
      }

      // Add delay between requests to avoid rate limits (except first request)
      if (page > 1 && delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Alps-CI',
        },
      });

      if (response.status === 401) {
        throw new GitHubAuthenticationError('Invalid or expired Personal Access Token');
      }

      if (!response.ok) {
        throw new GitHubAPIError(
          `GitHub API request failed: ${response.statusText}`,
          response.status
        );
      }

      const result = await response.json();
      const runs = result.workflow_runs || [];
      
      allRuns = allRuns.concat(runs);

      // Check if we should continue paginating
      if (limit !== undefined && allRuns.length >= limit) {
        hasMorePages = false;
      } else if (runs.length < perPage) {
        // No more pages available
        hasMorePages = false;
      } else {
        page++;
      }
    }

    console.log(`[GitHub] Fetched ${allRuns.length} workflow runs for ${owner}/${repo}`);

    return allRuns
      .filter((run: any) => {
        // Filter by workflow name if specified
        if (filters?.workflowName && run.name !== filters.workflowName) {
          return false;
        }

        // Filter by date if specified
        if (filters?.since) {
          const runDate = new Date(run.created_at);
          if (runDate < filters.since) {
            return false;
          }
        }

        return true;
      })
      .slice(0, limit)
      .map((run: any) => this.mapWorkflowRun(run));
  }

  async fetchTags(owner: string, repo: string, limit = 100): Promise<string[]> {
    console.log(`[GitHub] fetching tags for ${owner}/${repo}`);
    const query = `
      query($owner: String!, $repo: String!, $limit: Int!) {
        repository(owner: $owner, name: $repo) {
          refs(refPrefix: "refs/tags/", first: $limit, orderBy: {field: TAG_COMMIT_DATE, direction: DESC}) {
            nodes {
              name
              target {
                ... on Tag {
                  tagger {
                    date
                  }
                }
                ... on Commit {
                  committedDate
                }
              }
            }
          }
        }
      }
    `;

    const variables = { owner, repo, limit };

    const data = await this.query<{
      repository: {
        refs: {
          nodes: TagNode[];
        };
      };
    }>(query, variables);

    return data.repository.refs.nodes.map((node) => node.name);
  }

  async fetchLatestTag(owner: string, repo: string): Promise<string | null> {
    const tags = await this.fetchTags(owner, repo, 1);
    return tags.length > 0 ? (tags[0] ?? null) : null;
  }

  async fetchWorkflows(owner: string, repo: string): Promise<Array<{ name: string; path: string; state: string }>> {
    console.log(`[GitHub] fetching workflows for ${owner}/${repo}`);
    const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Alps-CI',
      },
    });

    if (response.status === 401) {
      throw new GitHubAuthenticationError('Invalid or expired Personal Access Token');
    }

    if (!response.ok) {
      throw new GitHubAPIError(
        `GitHub API request failed: ${response.statusText}`,
        response.status
      );
    }

    const result = await response.json();
    const workflows = result.workflows || [];

    return workflows.map((workflow: any) => ({
      name: workflow.name,
      path: workflow.path,
      state: workflow.state,
    }));
  }

  async validateToken(): Promise<boolean> {
    try {
      const query = `
        query {
          viewer {
            login
          }
        }
      `;

      await this.query<{ viewer: { login: string } }>(query);
      return true;
    } catch (error) {
      if (error instanceof GitHubAuthenticationError) {
        return false;
      }
      throw error;
    }
  }

  private mapWorkflowRun(run: any): WorkflowRun {
    const status = this.mapStatus(run.status, run.conclusion);
    const createdAt = new Date(run.created_at);
    const updatedAt = new Date(run.updated_at);

    // Calculate duration if run is completed
    let duration: number | undefined;
    if (run.run_started_at && run.updated_at && run.conclusion) {
      const startTime = new Date(run.run_started_at).getTime();
      const endTime = new Date(run.updated_at).getTime();
      duration = endTime - startTime;
    }

    return {
      id: run.id,
      name: run.name || run.display_title || 'Workflow Run',
      status,
      conclusion: run.conclusion,
      htmlUrl: run.html_url,
      createdAt,
      updatedAt,
      duration,
      headBranch: run.head_branch,
      event: run.event,
    };
  }

  private mapStatus(status: string, conclusion: string | null): WorkflowRunStatus {
    // If the run is completed, use the conclusion
    if (status === 'completed' && conclusion) {
      switch (conclusion) {
        case 'success':
          return 'success';
        case 'failure':
        case 'timed_out':
        case 'action_required':
          return 'failure';
        case 'cancelled':
        case 'skipped':
          return 'cancelled';
        default:
          return 'failure';
      }
    }

    // Otherwise, use the status
    switch (status) {
      case 'queued':
      case 'pending':
      case 'waiting':
        return 'queued';
      case 'in_progress':
      case 'requested':
        return 'in_progress';
      default:
        return 'queued';
    }
  }

  /**
   * Fetch commits from a repository within a date range
   */
  async fetchCommits(
    owner: string,
    repo: string,
    since?: Date,
    until?: Date
  ): Promise<number> {
    console.log(`[GitHub] fetching commits for ${owner}/${repo}`);
    try {
      const sinceParam = since ? `&since=${since.toISOString()}` : '';
      const untilParam = until ? `&until=${until.toISOString()}` : '';

      const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1${sinceParam}${untilParam}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Alps-CI',
        },
      });

      if (response.status === 401) {
        throw new GitHubAuthenticationError('Invalid or expired Personal Access Token');
      }

      if (!response.ok) {
        throw new GitHubAPIError(
          `GitHub API request failed: ${response.statusText}`,
          response.status
        );
      }

      // Get total count from Link header
      const linkHeader = response.headers.get('Link');
      if (linkHeader) {
        const match = linkHeader.match(/page=(\d+)>; rel="last"/);
        if (match && match[1]) {
          return parseInt(match[1], 10);
        }
      }

      // If no Link header, check if there are any commits
      const commits = await response.json();
      return Array.isArray(commits) ? commits.length : 0;
    } catch (error) {
      if (error instanceof GitHubAuthenticationError || error instanceof GitHubAPIError) {
        throw error;
      }
      throw new GitHubAPIError(`Failed to fetch commits: ${error}`);
    }
  }

  /**
   * Fetch contributors from a repository within a date range
   * For date-filtered requests, this fetches commits and extracts unique authors
   */
  async fetchContributors(
    owner: string,
    repo: string,
    since?: Date
  ): Promise<number> {
    console.log(`[GitHub] fetching total contributor for ${owner}/${repo}`);
    try {
      // First, fetch commits to get unique authors
      const sinceParam = since ? `&since=${since.toISOString()}` : '';
      const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100${sinceParam}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Alps-CI',
        },
      });

      if (response.status === 401) {
        throw new GitHubAuthenticationError('Invalid or expired Personal Access Token');
      }

      if (!response.ok) {
        throw new GitHubAPIError(
          `GitHub API request failed: ${response.statusText}`,
          response.status
        );
      }

      const commits = await response.json();

      if (!Array.isArray(commits)) {
        return 0;
      }

      // Extract unique contributor logins
      const contributors = new Set<string>();
      for (const commit of commits) {
        if (commit.author?.login) {
          contributors.add(commit.author.login);
        }
      }

      return contributors.size;
    } catch (error) {
      if (error instanceof GitHubAuthenticationError || error instanceof GitHubAPIError) {
        throw error;
      }
      throw new GitHubAPIError(`Failed to fetch contributors: ${error}`);
    }
  }

  /**
   * Fetch total number of contributors (all time) from a repository
   * Uses GitHub's dedicated contributors endpoint which returns all contributors
   */
  async fetchTotalContributors(
    owner: string,
    repo: string
  ): Promise<number> {    
    console.log(`[GitHub] fetching total contributor for ${owner}/${repo}`);
    try {
      // GitHub's contributors endpoint returns all contributors
      // We need to paginate through all pages to get accurate count
      let totalContributors = 0;
      let page = 1;
      const perPage = 100;

      while (true) {
        const url = `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=${perPage}&page=${page}&anon=1`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Alps-CI',
          },
        });

        if (response.status === 401) {
          throw new GitHubAuthenticationError('Invalid or expired Personal Access Token');
        }

        if (!response.ok) {
          throw new GitHubAPIError(
            `GitHub API request failed: ${response.statusText}`,
            response.status
          );
        }

        const contributors = await response.json();

        if (!Array.isArray(contributors) || contributors.length === 0) {
          break;
        }

        totalContributors += contributors.length;

        // If we got less than perPage results, we're done
        if (contributors.length < perPage) {
          break;
        }

        page++;
      }

      return totalContributors;
    } catch (error) {
      if (error instanceof GitHubAuthenticationError || error instanceof GitHubAPIError) {
        throw error;
      }
      throw new GitHubAPIError(`Failed to fetch total contributors: ${error}`);
    }
  }

  /**
   * Fetch list of contributors with their commit counts
   * Returns contributors ordered by number of contributions (descending)
   */
  async fetchContributorsList(
    owner: string,
    repo: string,
    limit: number = 50
  ): Promise<Array<{ login: string; name: string | null; avatarUrl: string; contributions: number; profileUrl: string }>> {
    console.log(`[GitHub] fetching contributors list for ${owner}/${repo}`);
    try {
      const allContributors: Array<{
        login: string;
        name: string | null;
        avatarUrl: string;
        contributions: number;
        profileUrl: string;
      }> = [];
      let page = 1;
      const perPage = 100;

      while (allContributors.length < limit) {
        const url = `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=${perPage}&page=${page}&anon=1`;

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Alps-CI',
          },
        });

        if (response.status === 401) {
          throw new GitHubAuthenticationError('Invalid or expired Personal Access Token');
        }

        if (!response.ok) {
          throw new GitHubAPIError(
            `GitHub API request failed: ${response.statusText}`,
            response.status
          );
        }

        const contributors = await response.json();

        if (!Array.isArray(contributors) || contributors.length === 0) {
          break;
        }

        // Map GitHub API response to our Contributor interface
        for (const contributor of contributors) {
          if (allContributors.length >= limit) {
            break;
          }

          allContributors.push({
            login: contributor.login || 'unknown',
            name: contributor.name || null,
            avatarUrl: contributor.avatar_url || '',
            contributions: contributor.contributions || 0,
            profileUrl: contributor.html_url || `https://github.com/${contributor.login}`,
          });
        }

        // If we got less than perPage results, we're done
        if (contributors.length < perPage || allContributors.length >= limit) {
          break;
        }

        page++;
      }

      // Already sorted by contributions DESC from GitHub API
      return allContributors.slice(0, limit);
    } catch (error) {
      if (error instanceof GitHubAuthenticationError || error instanceof GitHubAPIError) {
        throw error;
      }
      throw new GitHubAPIError(`Failed to fetch contributors list: ${error}`);
    }
  }

  /**
   * Fetch the last commit from a repository
   */
  async fetchLastCommit(
    owner: string,
    repo: string
  ): Promise<{ message: string; date: Date; author: string; sha: string; url: string } | null> {
    try {
      console.log(`[GitHub] fetching last commit for: ${owner}/${repo}`);
      const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Alps-CI',
        },
      });

      if (response.status === 401) {
        throw new GitHubAuthenticationError('Invalid or expired Personal Access Token');
      }

      if (!response.ok) {
        throw new GitHubAPIError(
          `GitHub API request failed: ${response.statusText}`,
          response.status
        );
      }

      const commits = await response.json();

      if (!Array.isArray(commits) || commits.length === 0) {
        return null;
      }

      const lastCommit = commits[0];

      return {
        message: lastCommit.commit.message,
        date: new Date(lastCommit.commit.author.date),
        author: lastCommit.commit.author.name,
        sha: lastCommit.sha,
        url: lastCommit.html_url,
      };
    } catch (error) {
      if (error instanceof GitHubAuthenticationError || error instanceof GitHubAPIError) {
        throw error;
      }
      throw new GitHubAPIError(`Failed to fetch last commit: ${error}`);
    }
  }

  /**
   * Fetch artifacts from a workflow run
   */
  async fetchArtifacts(owner: string, repo: string, runId: number): Promise<Array<{ id: number; name: string; size_in_bytes: number }>> {
    try {
      console.log('[GitHub] fetching artifacts for run:', runId);
      const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Alps-CI',
        },
      });

      if (response.status === 401) {
        throw new GitHubAuthenticationError('Invalid or expired Personal Access Token');
      }

      if (!response.ok) {
        throw new GitHubAPIError(
          `GitHub API request failed: ${response.statusText}`,
          response.status
        );
      }

      const result = await response.json();
      return result.artifacts || [];
    } catch (error) {
      if (error instanceof GitHubAuthenticationError || error instanceof GitHubAPIError) {
        throw error;
      }
      throw new GitHubAPIError(`Failed to fetch artifacts: ${error}`);
    }
  }

  /**
   * Download and extract XML files from artifact
   */
  async downloadArtifact(owner: string, repo: string, artifactId: number): Promise<string | null> {
    try {
      console.log('[GitHub] fetching artifact:', artifactId);
      const url = `https://api.github.com/repos/${owner}/${repo}/actions/artifacts/${artifactId}/zip`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Alps-CI',
        },
      });

      if (response.status === 401) {
        throw new GitHubAuthenticationError('Invalid or expired Personal Access Token');
      }

      if (response.status === 410) {
        // Artifact expired or deleted
        return null;
      }

      if (!response.ok) {
        throw new GitHubAPIError(
          `GitHub API request failed: ${response.statusText}`,
          response.status
        );
      }

      // Download the ZIP file
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Extract XML files from the ZIP
      try {
        const zip = new AdmZip(buffer);
        const zipEntries = zip.getEntries();

        // Find the first XML file in the ZIP
        for (const entry of zipEntries) {
          if (!entry.isDirectory && entry.entryName.toLowerCase().endsWith('.xml')) {
            // Extract and return the XML content as string
            const xmlContent = entry.getData().toString('utf8');
            return xmlContent;
          }
        }

        // No XML files found in the ZIP
        console.warn(`No XML files found in artifact ${artifactId}`);
        return null;
      } catch (zipError) {
        console.error(`Failed to extract ZIP for artifact ${artifactId}:`, zipError);
        return null;
      }
    } catch (error) {
      if (error instanceof GitHubAuthenticationError || error instanceof GitHubAPIError) {
        throw error;
      }
      console.error(`Failed to download artifact: ${error}`);
      return null;
    }
  }
}



