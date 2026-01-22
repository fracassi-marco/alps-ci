'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  MinusCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useSession } from '@/infrastructure/auth-client';
import Button from '../../../../components/Button';

interface TestSuite {
  name: string;
  suite: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
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
  testSuites: TestSuite[];
  message?: string;
}

interface WorkflowRun {
  name: string;
  createdAt: Date;
  duration?: number;
}

export default function TestResultsPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [buildId, setBuildId] = useState<string>('');
  const [runId, setRunId] = useState<string>('');
  const [buildName, setBuildName] = useState<string>('');
  const [organization, setOrganization] = useState<string>('');
  const [repository, setRepository] = useState<string>('');
  const [workflowRun, setWorkflowRun] = useState<WorkflowRun | null>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed' | 'skipped'>('all');
  const [expandedSuites, setExpandedSuites] = useState<Set<string>>(new Set());
  const [expandedFailedTests, setExpandedFailedTests] = useState<Set<string>>(new Set());

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      router.push('/auth/signin');
    }
  }, [session, isPending, router]);

  // Unwrap params
  useEffect(() => {
    params.then((p) => {
      setBuildId(p.id);
      setRunId(p.runId);
    });
  }, [params]);

  // Fetch test results
  useEffect(() => {
    if (!session || !buildId || !runId) {
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch build info first
        const buildResponse = await fetch(`/api/builds/${buildId}/stats`);
        if (buildResponse.ok) {
          const buildStats = await buildResponse.json();
          setBuildName(buildStats.buildName || 'Build');
          setOrganization(buildStats.organization || '');
          setRepository(buildStats.repository || '');

          // Find the workflow run info
          const run = buildStats.recentRuns?.find((r: any) => r.id.toString() === runId);
          if (run) {
            setWorkflowRun({
              name: run.name,
              createdAt: new Date(run.createdAt),
              duration: run.duration,
            });
          }
        }

        // Fetch test results
        const testResponse = await fetch(`/api/builds/${buildId}/tests/${runId}`);

        if (!testResponse.ok) {
          const errorData = await testResponse.json().catch(() => ({}));
          if (testResponse.status === 401) {
            throw new Error('Authentication failed. Please sign in again.');
          }
          if (testResponse.status === 404) {
            throw new Error('Test results not found.');
          }
          throw new Error(errorData.error || 'Failed to fetch test results.');
        }

        const data = await testResponse.json();
        setTestResults(data);
      } catch (err) {
        console.error('Error fetching test results:', err);
        setError(err instanceof Error ? err.message : 'Failed to load test results');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [session, buildId, runId]);

  // Calculate success rate
  const getSuccessRate = (): number => {
    if (!testResults || testResults.summary.total === 0) return 0;
    return Math.round((testResults.summary.passed / testResults.summary.total) * 100);
  };

  // Format duration
  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Format date
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Format test duration
  const formatTestDuration = (seconds: number): string => {
    if (seconds < 0.001) return '< 1ms';
    if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
    if (seconds < 10) return `${seconds.toFixed(2)}s`;
    return `${seconds.toFixed(1)}s`;
  };

  // Filter test cases
  const getFilteredTests = (): TestSuite[] => {
    if (!testResults) return [];

    let filtered = testResults.testSuites;

    if (filter !== 'all') {
      filtered = filtered.filter((test) => test.status === filter);
    }

    return filtered;
  };


  // Get filter counts
  const getFilterCounts = () => {
    if (!testResults) return { all: 0, passed: 0, failed: 0, skipped: 0 };

    return {
      all: testResults.testSuites.length,
      passed: testResults.summary.passed,
      failed: testResults.summary.failed,
      skipped: testResults.summary.skipped,
    };
  };

  // Group tests by suite
  const groupTestsBySuite = (): Map<string, TestSuite[]> => {
    const grouped = new Map<string, TestSuite[]>();
    const filtered = getFilteredTests();

    filtered.forEach((test) => {
      // test.suite is always the file path now
      const suiteName = test.suite;

      if (!grouped.has(suiteName)) {
        grouped.set(suiteName, []);
      }
      grouped.get(suiteName)!.push(test);
    });

    // Sort suites alphabetically and return
    return new Map(
      [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b))
    );
  };

  // Get suite status (aggregate of all tests in suite)
  const getSuiteStatus = (tests: TestSuite[]): 'passed' | 'failed' | 'skipped' => {
    const hasFailed = tests.some((t) => t.status === 'failed');
    const hasSkipped = tests.some((t) => t.status === 'skipped');

    if (hasFailed) return 'failed';
    if (hasSkipped) return 'skipped';
    return 'passed';
  };

  // Get suite duration (sum of all test durations)
  const getSuiteDuration = (tests: TestSuite[]): number => {
    return tests.reduce((sum, test) => sum + test.duration, 0);
  };

  // Toggle suite expansion
  const toggleSuite = (suiteName: string) => {
    setExpandedSuites((prev) => {
      const next = new Set(prev);
      if (next.has(suiteName)) {
        next.delete(suiteName);
      } else {
        next.add(suiteName);
      }
      return next;
    });
  };

  // Toggle failed test expansion
  const toggleFailedTest = (testKey: string) => {
    setExpandedFailedTests((prev) => {
      const next = new Set(prev);
      if (next.has(testKey)) {
        next.delete(testKey);
      } else {
        next.add(testKey);
      }
      return next;
    });
  };

  const filterCounts = getFilterCounts();
  const groupedSuites = groupTestsBySuite();

  if (isPending || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.back()}
                variant="secondary"
                icon={<ArrowLeft className="w-5 h-5" />}
                title="Back to dashboard"
              >
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Test Results
                </h1>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">{buildName}</span>
                  {workflowRun && (
                    <>
                      <span className="mx-2">•</span>
                      <span>{workflowRun.name}</span>
                      <span className="mx-2">•</span>
                      <span>{formatDate(workflowRun.createdAt)}</span>
                      {workflowRun.duration && (
                        <>
                          <span className="mx-2">•</span>
                          <Clock className="inline w-4 h-4 mb-0.5" />
                          <span className="ml-1">{formatDuration(workflowRun.duration)}</span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading test results...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-2">
                  Failed to Load Test Results
                </h3>
                <p className="text-red-800 dark:text-red-300">{error}</p>
                <Button
                  onClick={() => window.location.reload()}
                  variant="secondary"
                  className="mt-4"
                >
                  Retry
                </Button>
              </div>
            </div>
          </div>
        ) : testResults ? (
          <div className="space-y-6">
            {/* Message if no test results */}
            {testResults.summary.total === 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                      No Test Results Found
                    </h3>
                    <p className="text-yellow-800 dark:text-yellow-200 mb-2">
                      {testResults.message || 'No test artifacts were found for this workflow run.'}
                    </p>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
                      <p>
                        <strong>Possible reasons:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-2">
                        <li>Test artifacts may have expired (GitHub keeps artifacts for 90 days by default)</li>
                        <li>The workflow didn't upload test results as artifacts</li>
                        <li>Artifacts don't contain files matching the *test*.xml pattern</li>
                        <li>The artifact name doesn't contain "test"</li>
                      </ul>
                      <p className="mt-3">
                        <strong>To fix this:</strong> Make sure your CI workflow uploads test results as artifacts:
                      </p>
                      <pre className="bg-yellow-100 dark:bg-yellow-900/40 p-2 rounded text-xs overflow-x-auto mt-2">
{`- name: Upload test results
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: test-results.xml`}
                      </pre>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => router.back()}
                        variant="secondary"
                      >
                        Back to Dashboard
                      </Button>
                      {organization && repository && (
                        <Button
                          onClick={() => window.open(`https://github.com/${organization}/${repository}/actions/runs/${runId}`, '_blank')}
                          variant="ghost"
                        >
                          View Run on GitHub
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            {testResults.summary.total > 0 && (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                  {/* Total Tests */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Total Tests
                        </p>
                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                          {testResults.summary.total}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <CheckCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                  </div>

                  {/* Passed Tests */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Passed
                        </p>
                        <p className="mt-2 text-3xl font-bold text-green-600 dark:text-green-400">
                          {testResults.summary.passed}
                        </p>
                      </div>
                      <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                        <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                  </div>

                  {/* Failed Tests */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Failed
                        </p>
                        <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">
                          {testResults.summary.failed}
                        </p>
                      </div>
                      <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                        <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
                      </div>
                    </div>
                  </div>

                  {/* Skipped Tests */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Skipped
                        </p>
                        <p className="mt-2 text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                          {testResults.summary.skipped}
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                        <MinusCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    </div>
                  </div>

                  {/* Success Rate */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Success Rate
                        </p>
                        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                          {getSuccessRate()}%
                        </p>
                      </div>
                      <div
                        className={`p-3 rounded-lg ${
                          getSuccessRate() >= 80
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : getSuccessRate() >= 50
                            ? 'bg-yellow-100 dark:bg-yellow-900/30'
                            : 'bg-red-100 dark:bg-red-900/30'
                        }`}
                      >
                        <div
                          className={`text-2xl font-bold ${
                            getSuccessRate() >= 80
                              ? 'text-green-600 dark:text-green-400'
                              : getSuccessRate() >= 50
                              ? 'text-yellow-600 dark:text-yellow-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {getSuccessRate() >= 80 ? '✓' : getSuccessRate() >= 50 ? '⚠' : '✗'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Test Cases Table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {/* Header and Filters */}
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Test Suites ({groupedSuites.size})
                    </h2>

                    {/* Filter Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filter === 'all'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        All ({testResults?.testSuites.length || 0})
                      </button>
                      <button
                        onClick={() => setFilter('passed')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filter === 'passed'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Passed ({testResults?.summary.passed || 0})
                      </button>
                      <button
                        onClick={() => setFilter('failed')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filter === 'failed'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Failed ({testResults?.summary.failed || 0})
                      </button>
                      <button
                        onClick={() => setFilter('skipped')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filter === 'skipped'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Skipped ({testResults?.summary.skipped || 0})
                      </button>
                    </div>
                  </div>

                  {/* Accordion */}
                  {groupedSuites.size > 0 ? (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {Array.from(groupedSuites.entries()).map(([suiteName, suiteTests]) => {
                        const isExpanded = expandedSuites.has(suiteName);
                        const suiteStatus = getSuiteStatus(suiteTests);
                        const suiteDuration = getSuiteDuration(suiteTests);
                        const testCount = suiteTests.length;

                        // Sort tests within suite: failed first, then skipped, then passed
                        const sortedSuiteTests = [...suiteTests].sort((a, b) => {
                          const statusOrder = { failed: 0, skipped: 1, passed: 2 };
                          return statusOrder[a.status] - statusOrder[b.status];
                        });

                        return (
                          <div key={suiteName}>
                            {/* Suite Header Row */}
                            <button
                              onClick={() => toggleSuite(suiteName)}
                              className="w-full px-6 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                            >
                              {/* Expand/Collapse Icon */}
                              <div className="flex-shrink-0">
                                {isExpanded ? (
                                  <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                ) : (
                                  <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                )}
                              </div>

                              {/* Status Icon */}
                              <div className="flex-shrink-0">
                                {suiteStatus === 'passed' ? (
                                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                                ) : suiteStatus === 'failed' ? (
                                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                                ) : (
                                  <MinusCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                                )}
                              </div>

                              {/* Suite Name */}
                              <div className="flex-1 text-left">
                                <div className="font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                  {suiteName}
                                </div>
                              </div>

                              {/* Test Count */}
                              <div className="flex-shrink-0 text-sm text-gray-600 dark:text-gray-400">
                                {testCount} {testCount === 1 ? 'test' : 'tests'}
                              </div>

                              {/* Duration */}
                              <div className="flex-shrink-0 text-sm font-mono text-gray-900 dark:text-white">
                                {formatTestDuration(suiteDuration)}
                              </div>
                            </button>

                            {/* Expanded Test Details */}
                            {isExpanded && (
                              <div className="bg-gray-50 dark:bg-gray-900 px-6 py-4">
                                {suiteTests.length === 1 && suiteTests[0] && suiteTests[0].name === suiteName ? (
                                  // Suite-level summary only (no individual test details)
                                  <div className="text-sm text-gray-600 dark:text-gray-400 py-4 text-center">
                                    Individual test details not available in this format
                                  </div>
                                ) : (
                                  // Individual test details
                                  <div className="space-y-2">
                                    {sortedSuiteTests.map((test, index) => {
                                      const testKey = `${suiteName}-${index}`;
                                      const isTestExpanded = expandedFailedTests.has(testKey);

                                      return (
                                        <div key={testKey} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                          {/* Test Row */}
                                          <div
                                            className={`px-4 py-3 flex items-center gap-3 ${
                                              test.status === 'failed' ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''
                                            }`}
                                            onClick={() => test.status === 'failed' && toggleFailedTest(testKey)}
                                          >
                                            {/* Status Icon */}
                                            <div className="flex-shrink-0">
                                              {test.status === 'passed' ? (
                                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                              ) : test.status === 'failed' ? (
                                                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                              ) : (
                                                <MinusCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                                              )}
                                            </div>

                                            {/* Test Name */}
                                            <div className="flex-1 min-w-0">
                                              <div className="text-sm text-gray-900 dark:text-white truncate">
                                                {test.name}
                                              </div>
                                              {test.errorMessage && (
                                                <div className="text-xs text-red-600 dark:text-red-400 truncate mt-0.5">
                                                  {test.errorMessage}
                                                </div>
                                              )}
                                            </div>

                                            {/* Duration */}
                                            <div className="flex-shrink-0 text-xs font-mono text-gray-600 dark:text-gray-400">
                                              {formatTestDuration(test.duration)}
                                            </div>

                                            {/* Expand Icon for Failed Tests */}
                                            {test.status === 'failed' && test.stackTrace && (
                                              <div className="flex-shrink-0">
                                                {isTestExpanded ? (
                                                  <ChevronUp className="w-4 h-4 text-gray-400" />
                                                ) : (
                                                  <ChevronDown className="w-4 h-4 text-gray-400" />
                                                )}
                                              </div>
                                            )}
                                          </div>

                                          {/* Expanded Error Details */}
                                          {test.status === 'failed' && isTestExpanded && test.stackTrace && (
                                            <div className="border-t border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/10 px-4 py-3">
                                              <div className="text-xs font-semibold text-red-800 dark:text-red-300 mb-2">
                                                Stack Trace:
                                              </div>
                                              <div className="bg-gray-900 dark:bg-gray-950 rounded p-3 overflow-x-auto max-h-96 overflow-y-auto">
                                                <pre className="text-xs text-gray-100 font-mono whitespace-pre-wrap break-words">
                                                  {test.stackTrace}
                                                </pre>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-6 py-12 text-center">
                      <p className="text-gray-500 dark:text-gray-400">
                        No tests match the selected filter
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No test results available</p>
          </div>
        )}
      </div>
    </main>
  );
}
