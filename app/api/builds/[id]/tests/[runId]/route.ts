import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/infrastructure/auth-session';
import { DatabaseBuildRepository } from '@/infrastructure/DatabaseBuildRepository';
import { DatabaseTenantMemberRepository } from '@/infrastructure/DatabaseTenantMemberRepository';
import { DatabaseAccessTokenRepository } from '@/infrastructure/DatabaseAccessTokenRepository';
import { TokenResolutionService } from '@/infrastructure/TokenResolutionService';
import { parseJUnitXML } from '@/infrastructure/junit-parser';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

const buildRepository = new DatabaseBuildRepository();
const tenantMemberRepository = new DatabaseTenantMemberRepository();
const accessTokenRepository = new DatabaseAccessTokenRepository();
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
  testCases: TestCase[];
}

function getCacheKey(buildId: string, runId: string): string {
  return `test-results:${buildId}:${runId}`;
}

function getCachedResults(buildId: string, runId: string): TestResults | null {
  const cacheKey = getCacheKey(buildId, runId);
  const cached = testResultsCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`[TestResults] Cache HIT for ${cacheKey}`);
    return cached.data;
  }

  if (cached) {
    console.log(`[TestResults] Cache EXPIRED for ${cacheKey}`);
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
  console.log(`[TestResults] Cached results for ${cacheKey}`);
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

    console.log('[TestResults] Parsed XML structure keys:', Object.keys(result));

    // Handle both single testsuite and testsuites wrapper
    let testsuites = [];
    if (result.testsuites) {
      console.log('[TestResults] Found testsuites wrapper');
      // Multiple test suites
      if (result.testsuites.testsuite) {
        testsuites = Array.isArray(result.testsuites.testsuite)
          ? result.testsuites.testsuite
          : [result.testsuites.testsuite];
      }
      console.log(`[TestResults] Found ${testsuites.length} test suite(s)`);
    } else if (result.testsuite) {
      console.log('[TestResults] Found single testsuite');
      // Single test suite
      testsuites = [result.testsuite];
    }

    if (testsuites.length === 0) {
      console.log('[TestResults] No testsuites found in XML');
      return testCases;
    }

    // Process each test suite
    for (const testsuite of testsuites) {
      if (!testsuite) {
        console.log('[TestResults] Skipping null/undefined testsuite');
        continue;
      }

      const suiteName = testsuite['@_name'] || testsuite['@_file'] || 'Unknown Suite';
      console.log(`[TestResults] Processing suite: ${suiteName}`);

      if (!testsuite.testcase) {
        // Bun JUnit format doesn't include individual test cases, only suite-level stats
        // Create synthetic test case entries from suite-level data
        console.log(`[TestResults] Suite ${suiteName} has no testcase property - using suite-level stats`);

        const suiteTests = parseInt(testsuite['@_tests']?.toString() || '0', 10);
        const suiteFailures = parseInt(testsuite['@_failures']?.toString() || '0', 10);
        const suiteSkipped = parseInt(testsuite['@_skipped']?.toString() || '0', 10);
        const suitePassed = suiteTests - suiteFailures - suiteSkipped;
        const suiteTime = parseFloat(testsuite['@_time']?.toString() || '0');

        console.log(`[TestResults] Suite ${suiteName}: ${suiteTests} tests, ${suitePassed} passed, ${suiteFailures} failed, ${suiteSkipped} skipped`);

        // Create a summary entry for this suite
        if (suiteTests > 0) {
          testCases.push({
            name: suiteName,
            suite: 'Test Suite',
            status: suiteFailures > 0 ? 'failed' : (suiteSkipped > 0 ? 'skipped' : 'passed'),
            duration: suiteTime,
            errorMessage: suiteFailures > 0 ? `${suiteFailures} test(s) failed in this suite` : undefined,
          });
        }
        continue;
      }

      const testcases = Array.isArray(testsuite.testcase)
        ? testsuite.testcase
        : [testsuite.testcase];

      console.log(`[TestResults] Suite ${suiteName} has ${testcases.length} test case(s)`);

      for (const testcase of testcases) {
        const name = testcase['@_name'] || 'Unknown Test';
        const className = testcase['@_classname'] || testcase['@_class'] || suiteName;
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
          name,
          suite: className,
          status,
          duration,
          errorMessage,
          stackTrace,
        });
      }
    }
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

    // Resolve GitHub access token
    let token: string;
    try {
      token = await tokenResolutionService.resolveToken({
        accessTokenId: build.accessTokenId,
        inlineToken: build.personalAccessToken,
        tenantId: membership.tenantId,
      });
    } catch (error) {
      console.error('[TestResults] Token resolution error:', error);
      return NextResponse.json(
        {error: 'Failed to resolve access token. Please check your token configuration.'},
        {status: 400}
      );
    }

    console.log(`[TestResults] Fetching artifacts for run ${runId} in ${build.organization}/${build.repository}`);

    // Fetch artifacts from GitHub
    const artifacts = await fetchArtifacts(token, build.organization, build.repository, runId);

    console.log(`[TestResults] Found ${artifacts.length} total artifacts`);

    if (artifacts.length === 0) {
      console.log(`[TestResults] No artifacts found, returning empty results`);
      return NextResponse.json({
        summary: {total: 0, passed: 0, failed: 0, skipped: 0},
        testCases: [],
        message: 'No artifacts found for this workflow run',
      });
    }

    // Find artifacts containing test results
    const testArtifacts = artifacts.filter((artifact: any) =>
      artifact.name.toLowerCase().includes('test')
    );

    console.log(`[TestResults] Found ${testArtifacts.length} test artifacts:`, testArtifacts.map((a: any) => a.name));

    if (testArtifacts.length === 0) {
      console.log(`[TestResults] No test artifacts found`);
      return NextResponse.json({
        summary: {total: 0, passed: 0, failed: 0, skipped: 0},
        testCases: [],
        message: 'No test artifacts found for this workflow run',
      });
    }

    console.log(`[TestResults] Found ${testArtifacts.length} test artifact(s)`);

    // Download and parse all test artifacts
    const allTestCases: TestCase[] = [];

    for (const artifact of testArtifacts) {
      try {
        console.log(`[TestResults] Downloading artifact: ${artifact.name}`);
        const xmlFiles = await downloadAndExtractArtifact(token, artifact.archive_download_url);

        console.log(`[TestResults] Extracted ${xmlFiles.length} XML file(s) from ${artifact.name}`);

        for (const xmlContent of xmlFiles) {
          // Try using existing parseJUnitXML utility first
          const junitStats = parseJUnitXML(xmlContent);

          console.log(`[TestResults] parseJUnitXML returned:`, junitStats);

          if (junitStats) {
            // If parseJUnitXML works, extract detailed test cases
            console.log(`[TestResults] Parsing detailed test cases from XML (length: ${xmlContent.length} chars)`);
            const testCases = parseTestCases(xmlContent);
            console.log(`[TestResults] Extracted ${testCases.length} test cases`);

            if (testCases.length > 0) {
              console.log(`[TestResults] Sample test case:`, testCases[0]);
            } else {
              console.log(`[TestResults] No test cases extracted. XML preview:`, xmlContent.substring(0, 500));
            }

            allTestCases.push(...testCases);
          }
        }
      } catch (error) {
        console.error(`[TestResults] Error processing artifact ${artifact.name}:`, error);
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
      testCases: allTestCases,
    };

    // Cache the results
    setCachedResults(id, runId, results);

    console.log(
      `[TestResults] Parsed ${summary.total} test cases (${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped)`
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error('[TestResults] Error fetching test results:', error);

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
