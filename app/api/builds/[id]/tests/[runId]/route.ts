import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/infrastructure/auth-session';
import { DatabaseBuildRepository } from '@/infrastructure/DatabaseBuildRepository';
import { DatabaseTenantMemberRepository } from '@/infrastructure/DatabaseTenantMemberRepository';
import { DatabaseAccessTokenRepository } from '@/infrastructure/DatabaseAccessTokenRepository';
import { DatabaseWorkflowRunRepository } from '@/infrastructure/DatabaseWorkflowRunRepository';
import { DatabaseTestResultRepository } from '@/infrastructure/DatabaseTestResultRepository';
import { TokenResolutionService } from '@/infrastructure/TokenResolutionService';
import { parseJUnitXML } from '@/infrastructure/junit-parser';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

const buildRepository = new DatabaseBuildRepository();
const tenantMemberRepository = new DatabaseTenantMemberRepository();
const accessTokenRepository = new DatabaseAccessTokenRepository();
const workflowRunRepository = new DatabaseWorkflowRunRepository();
const testResultRepository = new DatabaseTestResultRepository();
const tokenResolutionService = new TokenResolutionService(accessTokenRepository);

// In-memory cache for test results (1 hour TTL)
const testResultsCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds

interface TestCase {
  name: string;
  suite: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number; // in seconds
  errorMessage?: string;
  stackTrace?: string;
}

interface TestResultsSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
}

interface TestResults {
  summary: TestResultsSummary;
  testSuites: TestCase[];
}

function getCacheKey(buildId: string, runId: string): string {
  return `test-results:${buildId}:${runId}`;
}

function getCachedResults(buildId: string, runId: string): TestResults | null {
  const cacheKey = getCacheKey(buildId, runId);
  const cached = testResultsCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  if (cached) {
    testResultsCache.delete(cacheKey);
  }

  return null;
}

function setCachedResults(buildId: string, runId: string, data: TestResults): void {
  const cacheKey = getCacheKey(buildId, runId);
  testResultsCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
}

async function fetchArtifacts(token: string, owner: string, repo: string, runId: string) {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Workflow run not found');
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error('Authentication failed. Please check your Personal Access Token.');
    }
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();
  return data.artifacts || [];
}

async function downloadAndExtractArtifact(token: string, artifactUrl: string): Promise<string[]> {
  // Download artifact
  const response = await fetch(artifactUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to download artifact: ${response.status}`);
  }

  const zipBuffer = await response.arrayBuffer();
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(zipBuffer);

  // Extract XML files
  const xmlFiles: string[] = [];
  const filePromises: Promise<void>[] = [];

  zipContent.forEach((relativePath, file) => {
    if (relativePath.toLowerCase().includes('test') && relativePath.toLowerCase().endsWith('.xml')) {
      filePromises.push(
        file.async('string').then((content) => {
          xmlFiles.push(content);
        })
      );
    }
  });

  await Promise.all(filePromises);
  return xmlFiles;
}

function parseTestCases(xmlContent: string): TestCase[] {
  const testCases: TestCase[] = [];

  try {
    // Parse XML using fast-xml-parser
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      parseTagValue: true,
      parseAttributeValue: true,
      trimValues: true,
    });

    const result = parser.parse(xmlContent);

    // Handle both single testsuite and testsuites wrapper
    let testsuites = [];
    if (result.testsuites) {
      if (result.testsuites.testsuite) {
        testsuites = Array.isArray(result.testsuites.testsuite)
          ? result.testsuites.testsuite
          : [result.testsuites.testsuite];
      }
    } else if (result.testsuite) {
      testsuites = Array.isArray(result.testsuite) ? result.testsuite : [result.testsuite];
    }

    console.log(`[TestResults] Found ${testsuites.length} test suite(s)`);

    if (testsuites.length === 0) {
      return testCases;
    }

    // Recursive function to process testsuites (handle nested structure)
    const processTestSuite = (testsuite: any) => {
      if (!testsuite) {
        return;
      }

      // Use testsuite.name as specified by user, fallback to file
      const suiteName = testsuite['@_name'] || testsuite['@_file'] || 'Unknown Suite';
      const suiteFile = testsuite['@_file'] || suiteName;

      console.log(`[TestResults] Processing suite: ${suiteName} (file: ${suiteFile})`);

      // Process testcases at this level first (if any)
      if (testsuite.testcase) {
        const testcases = Array.isArray(testsuite.testcase)
          ? testsuite.testcase
          : [testsuite.testcase];

        console.log(`[TestResults] Suite ${suiteName} has ${testcases.length} testcase(s)`);

        for (const testcase of testcases) {
          // Use testcase.name as specified by user
          const testName = testcase['@_name'] || 'Unknown Test';
          const timeStr = testcase['@_time'] || '0';
          const duration = parseFloat(timeStr.toString());

          // Determine status
          let status: 'passed' | 'failed' | 'skipped' = 'passed';
          let errorMessage: string | undefined;
          let stackTrace: string | undefined;

          if (testcase.failure) {
            status = 'failed';
            const failure = testcase.failure;
            errorMessage = failure['@_message'] || failure['#text'] || 'Test failed';
            stackTrace = failure['#text'] || undefined;
          } else if (testcase.error) {
            status = 'failed';
            const error = testcase.error;
            errorMessage = error['@_message'] || error['#text'] || 'Test error';
            stackTrace = error['#text'] || undefined;
          } else if (testcase.skipped) {
            status = 'skipped';
            const skipped = testcase.skipped;
            errorMessage = skipped['@_message'] || skipped['#text'] || 'Test skipped';
          }

          testCases.push({
            name: testName,
            suite: suiteFile, // Use file path as suite identifier
            status,
            duration,
            errorMessage,
            stackTrace,
          });
        }
      }

      // Now check if this testsuite has nested testsuites and process them
      if (testsuite.testsuite) {
        console.log(`[TestResults] Suite ${suiteName} has nested testsuites`);
        const nestedSuites = Array.isArray(testsuite.testsuite)
          ? testsuite.testsuite
          : [testsuite.testsuite];
        nestedSuites.forEach(processTestSuite);
      }

      // If no testcases and no nested testsuites, create suite-level summary
      if (!testsuite.testcase && !testsuite.testsuite) {
        console.log(`[TestResults] Suite ${suiteName} has no testcase or nested testsuite`);
        // Bun format without individual test cases - create suite-level summary
        const suiteTests = parseInt(testsuite['@_tests']?.toString() || '0', 10);
        const suiteFailures = parseInt(testsuite['@_failures']?.toString() || '0', 10);
        const suiteSkipped = parseInt(testsuite['@_skipped']?.toString() || '0', 10);
        const suiteTime = parseFloat(testsuite['@_time']?.toString() || '0');

        // Create a summary entry for this suite
        if (suiteTests > 0) {
          testCases.push({
            name: suiteName,
            suite: suiteFile,
            status: suiteFailures > 0 ? 'failed' : (suiteSkipped > 0 ? 'skipped' : 'passed'),
            duration: suiteTime,
            errorMessage: suiteFailures > 0 ? `${suiteFailures} test(s) failed in this suite` : undefined,
          });
        }
      }
    };

    // Process each test suite
    testsuites.forEach(processTestSuite);

    console.log(`[TestResults] Extracted ${testCases.length} test cases total`);
  } catch (error) {
    console.error('[TestResults] Error parsing test cases:', error);
  }

  return testCases;
}

export async function GET(
  request: Request,
  {params}: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    // Get current user
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        {error: 'Unauthorized. Please sign in.'},
        {status: 401}
      );
    }

    const {id, runId} = await params;

    // Check cache first
    const cachedResults = getCachedResults(id, runId);
    if (cachedResults) {
      return NextResponse.json(cachedResults);
    }

    // Get user's tenant memberships
    const memberships = await tenantMemberRepository.findByUserId(currentUser.id);
    if (memberships.length === 0) {
      return NextResponse.json(
        {error: 'No tenant membership found'},
        {status: 404}
      );
    }

    const membership = memberships[0];
    if (!membership) {
      return NextResponse.json(
        {error: 'No tenant membership found'},
        {status: 404}
      );
    }

    // Fetch build and verify tenant ownership
    const build = await buildRepository.findById(id, membership.tenantId);
    if (!build) {
      return NextResponse.json(
        {error: 'Build not found or access denied'},
        {status: 404}
      );
    }

    // Try to fetch test results from database first
    const workflowRun = await workflowRunRepository.findByGithubRunId(
      build.id,
      parseInt(runId, 10),
      membership.tenantId
    );

    console.log(`[TestResults] Workflow run lookup:`, {
      buildId: build.id,
      runId,
      found: !!workflowRun,
    });

    if (workflowRun) {
      const testResult = await testResultRepository.findByWorkflowRunId(
        workflowRun.id,
        membership.tenantId
      );

      if (testResult) {
        console.log(`[TestResults] Found test result in database:`, {
          totalTests: testResult.totalTests,
          hasTestCases: !!testResult.testCases,
          testCasesLength: testResult.testCases?.length || 0,
        });

        // Map database test cases to API format (handle null testCases)
        const testSuites: TestCase[] = testResult.testCases && testResult.testCases.length > 0
          ? testResult.testCases.map((tc) => ({
              name: tc.name || 'Unknown Test',
              suite: tc.suite || tc.file || 'Unknown Suite',
              status: tc.status,
              duration: (tc.duration || 0) / 1000, // Convert ms to seconds
              errorMessage: tc.error || undefined,
            }))
          : []; // Empty array if no detailed test cases available

        // Return test results from database
        const results: TestResults = {
          summary: {
            total: testResult.totalTests,
            passed: testResult.passedTests,
            failed: testResult.failedTests,
            skipped: testResult.skippedTests,
          },
          testSuites,
        };

        // If no detailed test cases but we have summary stats, add a note
        if (testSuites.length === 0 && testResult.totalTests > 0) {
          console.log('[TestResults] Returning summary without detailed test cases');
          return NextResponse.json({
            ...results,
            message: 'Test summary available. Detailed test case information not available.',
            cachedAt: testResult.parsedAt.toISOString(),
            source: 'database',
          });
        }

        // Also cache in memory for faster subsequent requests
        setCachedResults(id, runId, results);

        console.log('[TestResults] Returning full test results from database');
        return NextResponse.json({
          ...results,
          cachedAt: testResult.parsedAt.toISOString(),
          source: 'database',
        });
      }
    }

    // Fallback: Fetch from GitHub artifacts if not in database
    console.log('[TestResults] No test results in database, fetching from GitHub artifacts');

    // Resolve GitHub access token
    let token: string;
    try {
      token = await tokenResolutionService.resolveToken({
        accessTokenId: build.accessTokenId,
        inlineToken: build.personalAccessToken,
        tenantId: membership.tenantId,
      });
      console.log('[TestResults] Token resolved successfully');
    } catch (error) {
      console.error('[TestResults] Failed to resolve token:', error);
      return NextResponse.json(
        {error: 'Failed to resolve access token. Please check your token configuration.'},
        {status: 400}
      );
    }
    
    console.log(`[TestResults] Fetching artifacts for ${build.organization}/${build.repository}/runs/${runId}`);
    const artifacts = await fetchArtifacts(token, build.organization, build.repository, runId);

    console.log(`[TestResults] Found ${artifacts.length} artifact(s)`);

    if (artifacts.length === 0) {
      return NextResponse.json({
        summary: {total: 0, passed: 0, failed: 0, skipped: 0},
        testSuites: [],
        message: 'No artifacts found for this workflow run',
      });
    }

    // Find artifacts containing test results
    const testArtifacts = artifacts.filter((artifact: any) =>
      artifact.name.toLowerCase().includes('test')
    );

    console.log(`[TestResults] Found ${testArtifacts.length} test artifact(s):`, 
      testArtifacts.map((a: any) => a.name));

    if (testArtifacts.length === 0) {
      return NextResponse.json({
        summary: {total: 0, passed: 0, failed: 0, skipped: 0},
        testSuites: [],
        message: 'No test artifacts found for this workflow run',
      });
    }

    const allTestCases: TestCase[] = [];

    for (const artifact of testArtifacts) {
      try {
        const xmlFiles = await downloadAndExtractArtifact(token, artifact.archive_download_url);

        for (const xmlContent of xmlFiles) {
          const junitStats = parseJUnitXML(xmlContent);

          if (junitStats) {
            const testCases = parseTestCases(xmlContent);

            allTestCases.push(...testCases);
          }
        }
      } catch (error) {
        // Continue with next artifact
      }
    }

    // Calculate summary
    const summary: TestResultsSummary = {
      total: allTestCases.length,
      passed: allTestCases.filter((tc) => tc.status === 'passed').length,
      failed: allTestCases.filter((tc) => tc.status === 'failed').length,
      skipped: allTestCases.filter((tc) => tc.status === 'skipped').length,
    };

    const results: TestResults = {
      summary,
      testSuites: allTestCases,
    };

    setCachedResults(id, runId, results);

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Authentication failed')) {
        return NextResponse.json(
          {error: error.message},
          {status: 401}
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json(
          {error: error.message},
          {status: 404}
        );
      }
      return NextResponse.json(
        {error: error.message},
        {status: 500}
      );
    }

    return NextResponse.json(
      {error: 'Failed to fetch test results'},
      {status: 500}
    );
  }
}
