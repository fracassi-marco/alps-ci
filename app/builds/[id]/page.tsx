'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Trash2,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  GitBranch,
  Tag,
  Workflow,
  Activity,
  CheckCircle,
  XCircle,
  GitCommit,
  ChevronDown,
  User,
  LogOut,
} from 'lucide-react';
import { useSession, signOut } from '@/infrastructure/auth-client';
import Button from '../../components/Button';
import { BuildDetailsChart } from '../../components/BuildDetailsChart';
import { MonthlyCommitsChart } from '../../components/MonthlyCommitsChart';
import { MonthlyTestsChart } from '../../components/MonthlyTestsChart';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { Build, BuildDetailsStats, Selector, WorkflowRun } from '@/domain/models';

export default function BuildDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const buildId = params.id as string;
  const { data: session, isPending } = useSession();

  const [build, setBuild] = useState<Build | null>(null);
  const [stats, setStats] = useState<BuildDetailsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRecentRuns, setShowRecentRuns] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      router.push('/auth/signin');
    }
  }, [session, isPending, router]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowUserMenu(false);
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  useEffect(() => {
    if (session) {
      fetchBuildDetails();
    }
  }, [buildId, session]);

  const fetchBuildDetails = async () => {
    try {
      setError(null);
      setLoading(true);

      // Fetch build details
      const buildResponse = await fetch(`/api/builds/${buildId}`);
      if (!buildResponse.ok) {
        throw new Error('Failed to fetch build');
      }
      const buildData = await buildResponse.json();
      setBuild(buildData);

      // Fetch extended stats with monthly data
      const statsResponse = await fetch(`/api/builds/${buildId}/details`);
      if (statsResponse.status === 401) {
        const data = await statsResponse.json();
        setError(data.error);
        setStats(null);
      } else if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      } else {
        throw new Error('Failed to fetch statistics');
      }
    } catch (err) {
      console.error('Error fetching build details:', err);
      setError('Failed to load build details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/?edit=${buildId}`);
  };

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/builds/${buildId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/');
      } else {
        throw new Error('Failed to delete build');
      }
    } catch (err) {
      console.error('Error deleting build:', err);
      alert('Failed to delete build. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
  };

  const getSelectorIcon = (type: Selector['type']) => {
    switch (type) {
      case 'tag':
        return <Tag className="w-4 h-4" />;
      case 'branch':
        return <GitBranch className="w-4 h-4" />;
      case 'workflow':
        return <Workflow className="w-4 h-4" />;
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/signin');
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Show loading while checking auth
  if (isPending || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading build details...</p>
        </div>
      </div>
    );
  }

  if (!build) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Build not found</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Builds
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Consistent Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🏔</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Alps-CI
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Build Details
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* User Menu */}
              <div className="relative">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu(!showUserMenu);
                  }}
                  variant="secondary"
                  icon={<User className="w-5 h-5" />}
                  className="gap-2"
                >
                  <span className="text-sm font-medium">{session.user?.name || session.user?.email}</span>
                </Button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-50">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push('/organization');
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      <User className="w-4 h-4" />
                      Organization
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Page Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Build Header with Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Builds
          </button>

          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-700 dark:to-blue-700 rounded-lg shadow-lg p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-2">{build.name}</h1>
                <a
                  href={`https://github.com/${build.organization}/${build.repository}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-100 hover:text-white hover:underline transition-colors inline-flex items-center gap-1 text-lg"
                >
                  {build.organization}/{build.repository}
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={fetchBuildDetails}
                  className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                  title="Refresh data"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
                <button
                  onClick={handleEdit}
                  className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                  title="Edit build"
                >
                  <Edit className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
                  title="Delete build"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
                  {error}
                </p>
                <button
                  onClick={handleEdit}
                  className="text-sm text-red-700 dark:text-red-300 underline hover:no-underline font-medium"
                >
                  Update Personal Access Token
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Chart */}
        {stats && (
          <div className="mb-6">
            <BuildDetailsChart monthlyStats={stats.monthlyStats} />
          </div>
        )}

        {/* Monthly Commits Chart */}
        {stats && stats.monthlyCommits && stats.monthlyCommits.length > 0 && (
          <div className="mb-6">
            <MonthlyCommitsChart monthlyCommits={stats.monthlyCommits} />
          </div>
        )}

        {/* Test Stats Box */}
        {stats && stats.testStats && stats.recentRuns && stats.recentRuns.length > 0 && (
          <div className="mb-6">
            <button
              onClick={() => router.push(`/builds/${buildId}/tests/${stats.recentRuns[0]!.id}`)}
              className="w-full bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <span className="text-sm text-purple-700 dark:text-purple-300 font-medium group-hover:underline">
                  Test Results (Last Run)
                </span>
                <ExternalLink className="w-4 h-4 text-purple-600 dark:text-purple-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Total</div>
                  <div className="text-lg font-bold text-purple-900 dark:text-purple-200">
                    {stats.testStats.totalTests}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-green-600 dark:text-green-400 mb-1">Passed</div>
                  <div className="text-lg font-bold text-green-700 dark:text-green-300">
                    {stats.testStats.passedTests}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-red-600 dark:text-red-400 mb-1">Failed</div>
                  <div className="text-lg font-bold text-red-700 dark:text-red-300">
                    {stats.testStats.failedTests}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Skipped</div>
                  <div className="text-lg font-bold text-gray-700 dark:text-gray-300">
                    {stats.testStats.skippedTests}
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Monthly Tests Chart */}
        {stats && stats.testTrend && stats.testTrend.length > 0 && (
          <div className="mb-6">
            <MonthlyTestsChart testTrend={stats.testTrend} />
          </div>
        )}

        {/* Additional Info Sections */}
        {stats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Last Tag */}
            {stats.lastTag && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                    Latest Tag:
                  </span>
                  <span className="text-sm text-blue-900 dark:text-blue-200 font-mono font-bold">
                    {stats.lastTag}
                  </span>
                </div>
              </div>
            )}

            {/* Last Commit */}
            {stats.lastCommit && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <GitCommit className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                        Last Commit:
                      </span>
                      <a
                        href={stats.lastCommit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-mono text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        {stats.lastCommit.sha.substring(0, 7)}
                      </a>
                    </div>
                    <p className="text-sm text-emerald-900 dark:text-emerald-100 mb-2 break-words">
                      {stats.lastCommit.message.split('\n')[0]}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-emerald-700 dark:text-emerald-300">
                      <span className="font-medium">{stats.lastCommit.author}</span>
                      <span>•</span>
                      <span>{formatDate(stats.lastCommit.date)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Runs Accordion */}
        {stats && stats.recentRuns.length > 0 && (
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setShowRecentRuns(!showRecentRuns)}
              className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                Recent Workflow Runs ({stats.recentRuns.length})
              </span>
              <ChevronDown
                className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
                  showRecentRuns ? 'transform rotate-180' : ''
                }`}
              />
            </button>

            {showRecentRuns && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-6">
                <div className="space-y-2">
                  {stats.recentRuns.map((run) => (
                    <a
                      key={run.id}
                      href={run.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg p-4 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {run.status === 'success' ? (
                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : run.status === 'failure' ? (
                            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                          ) : (
                            <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {run.name}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {formatDate(run.createdAt)}
                              {run.duration && ` • ${Math.round(run.duration / 1000 / 60)}m`}
                              {run.headBranch && ` • ${run.headBranch}`}
                            </div>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-400" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Metadata Accordion */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              Build Metadata
            </span>
            <ChevronDown
              className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
                showMetadata ? 'transform rotate-180' : ''
              }`}
            />
          </button>

          {showMetadata && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Cache Expiration:</span>
                  <p className="text-gray-600 dark:text-gray-400">{build.cacheExpirationMinutes} min</p>
                </div>
                {stats && (
                  <>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Last Fetched:</span>
                      <p className="text-gray-600 dark:text-gray-400">{formatDate(stats.lastFetchedAt)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">Avg Duration:</span>
                      <p className="text-gray-600 dark:text-gray-400">
                        {stats.recentRuns.length > 0 && stats.recentRuns.some(r => r.duration) ? (
                          `${Math.round(
                            stats.recentRuns
                              .filter(r => r.duration)
                              .reduce((sum, r) => sum + (r.duration || 0), 0) /
                              stats.recentRuns.filter(r => r.duration).length /
                              1000 /
                              60
                          )}m`
                        ) : (
                          'N/A'
                        )}
                      </p>
                    </div>
                  </>
                )}
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Created:</span>
                  <p className="text-gray-600 dark:text-gray-400">{formatDate(build.createdAt)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Updated:</span>
                  <p className="text-gray-600 dark:text-gray-400">{formatDate(build.updatedAt)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteModal && build && !isDeleting && (
        <ConfirmDialog
          title="Delete Build?"
          message={`Are you sure you want to delete "${build.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isDestructive
        />
      )}

      {/* Deleting Overlay */}
      {isDeleting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Deleting build...</p>
          </div>
        </div>
      )}
    </div>
  );
}
