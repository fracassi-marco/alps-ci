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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { useSession } from '@/infrastructure/auth-client';
import Button from '../../../../components/Button';

interface TestCase {
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
  testCases: TestCase[];
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
  params: Promise<{ buildId: string; runId: string }>;
}) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [buildId, setBuildId] = useState<string>('');
  const [runId, setRunId] = useState<string>('');
  const [buildName, setBuildName] = useState<string>('');
  const [workflowRun, setWorkflowRun] = useState<WorkflowRun | null>(null);
  const [testResults, setTestResults] = useState<TestResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'passed' | 'failed' | 'skipped'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'duration' | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      router.push('/auth/signin');
    }
  }, [session, isPending, router]);

  // Unwrap params
  useEffect(() => {
    params.then((p) => {
      setBuildId(p.buildId);
      setRunId(p.runId);
    });
  }, [params]);

  // Fetch test results
  useEffect(() => {
    if (!session || !buildId || !runId) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch build info first
        const buildResponse = await fetch(`/api/builds/${buildId}/stats`);
        if (buildResponse.ok) {
          const buildStats = await buildResponse.json();
          setBuildName(buildStats.buildName || 'Build');

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
          if (testResponse.status === 401) {
            throw new Error('Authentication failed. Please sign in again.');
          }
          if (testResponse.status === 404) {
            throw new Error('Test results not found.');
          }
          throw new Error('Failed to fetch test results.');
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
  const getFilteredTests = (): TestCase[] => {
    if (!testResults) return [];

    let filtered = testResults.testCases;

    if (filter !== 'all') {
      filtered = filtered.filter((test) => test.status === filter);
    }

    return filtered;
  };

  // Sort test cases
  const getSortedTests = (): TestCase[] => {
    const filtered = getFilteredTests();

    if (!sortBy) return filtered;

    return [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'duration') {
        comparison = a.duration - b.duration;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  // Handle sort
  const handleSort = (column: 'name' | 'duration') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  // Get filter counts
  const getFilterCounts = () => {
    if (!testResults) return { all: 0, passed: 0, failed: 0, skipped: 0 };

    return {
      all: testResults.testCases.length,
      passed: testResults.summary.passed,
      failed: testResults.summary.failed,
      skipped: testResults.summary.skipped,
    };
  };

  const filterCounts = getFilterCounts();
  const displayedTests = getSortedTests();

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
            {testResults.message && testResults.summary.total === 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <p className="text-yellow-800 dark:text-yellow-200">{testResults.message}</p>
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
                      Test Cases ({displayedTests.length})
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
                        All ({filterCounts.all})
                      </button>
                      <button
                        onClick={() => setFilter('passed')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filter === 'passed'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Passed ({filterCounts.passed})
                      </button>
                      <button
                        onClick={() => setFilter('failed')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filter === 'failed'
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Failed ({filterCounts.failed})
                      </button>
                      <button
                        onClick={() => setFilter('skipped')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          filter === 'skipped'
                            ? 'bg-yellow-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        Skipped ({filterCounts.skipped})
                      </button>
                    </div>
                  </div>

                  {/* Table */}
                  {displayedTests.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider w-16">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              <button
                                onClick={() => handleSort('name')}
                                className="flex items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              >
                                Test Name
                                {sortBy === 'name' ? (
                                  sortOrder === 'asc' ? (
                                    <ArrowUp className="w-4 h-4" />
                                  ) : (
                                    <ArrowDown className="w-4 h-4" />
                                  )
                                ) : (
                                  <ArrowUpDown className="w-4 h-4 opacity-50" />
                                )}
                              </button>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              Test Suite
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                              <button
                                onClick={() => handleSort('duration')}
                                className="flex items-center gap-2 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              >
                                Duration
                                {sortBy === 'duration' ? (
                                  sortOrder === 'asc' ? (
                                    <ArrowUp className="w-4 h-4" />
                                  ) : (
                                    <ArrowDown className="w-4 h-4" />
                                  )
                                ) : (
                                  <ArrowUpDown className="w-4 h-4 opacity-50" />
                                )}
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {displayedTests.map((testCase, index) => (
                            <tr
                              key={`${testCase.suite}-${testCase.name}-${index}`}
                              className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              {/* Status Icon */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                {testCase.status === 'passed' ? (
                                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                ) : testCase.status === 'failed' ? (
                                  <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                ) : (
                                  <MinusCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                )}
                              </td>

                              {/* Test Name */}
                              <td className="px-6 py-4">
                                <div
                                  className="text-sm text-gray-900 dark:text-white truncate max-w-md"
                                  title={testCase.name}
                                >
                                  {testCase.name}
                                </div>
                              </td>

                              {/* Test Suite */}
                              <td className="px-6 py-4">
                                <div
                                  className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs"
                                  title={testCase.suite}
                                >
                                  {testCase.suite}
                                </div>
                              </td>

                              {/* Duration */}
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-900 dark:text-white font-mono">
                                  {formatTestDuration(testCase.duration)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
