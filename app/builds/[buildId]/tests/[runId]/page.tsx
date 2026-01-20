'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, XCircle, MinusCircle, Clock, AlertCircle } from 'lucide-react';
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

                {/* Test Cases Table - Placeholder for next step */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Test Cases ({testResults.testCases.length})
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    Test cases table will be implemented in the next step.
                  </p>
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
