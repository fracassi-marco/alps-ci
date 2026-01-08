'use client';

import { useState, useEffect } from 'react';
import {
  Trash2,
  Edit,
  RefreshCw,
  GitBranch,
  Tag,
  Workflow,
  Activity,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronDown,
  GitCommit
} from 'lucide-react';
import type { Build, Selector, BuildStats } from '@/domain/models';

interface BuildCardProps {
  build: Build;
  onEdit: (build: Build) => void;
  onDelete: (build: Build) => void;
  onRefresh: (build: Build) => void;
}

export function BuildCard({ build, onEdit, onDelete, onRefresh }: BuildCardProps) {
  const [stats, setStats] = useState<BuildStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showRecentRuns, setShowRecentRuns] = useState(false);

  useEffect(() => {
    fetchStats();
  }, [build.id]);

  const fetchStats = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/builds/${build.id}/stats`);

      if (response.status === 401) {
        const data = await response.json();
        setError(data.error);
        setStats(null);
      } else if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        throw new Error('Failed to fetch statistics');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to fetch statistics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      setError(null);
      const response = await fetch(`/api/builds/${build.id}/stats`, {
        method: 'POST',
      });

      if (response.status === 401) {
        const data = await response.json();
        setError(data.error);
        setStats(null);
      } else if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        throw new Error('Failed to refresh statistics');
      }
    } catch (err) {
      console.error('Error refreshing stats:', err);
      setError('Failed to refresh statistics. Please try again.');
    } finally {
      setRefreshing(false);
      onRefresh(build);
    }
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };


  const maxDailyTotal = stats
    ? Math.max(...stats.last7DaysSuccesses.map((d) => (d.successCount + (d.failureCount || 0))), 1)
    : 1;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-700 dark:to-blue-700 px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-1">
              {build.name}
            </h3>
            <a
              href={`https://github.com/${build.organization}/${build.repository}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-100 hover:text-white hover:underline transition-colors inline-flex items-center gap-1"
              title="Open repository on GitHub"
            >
              {build.organization}/{build.repository}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex gap-2 ml-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => onEdit(build)}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              title="Edit build"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={() => onDelete(build)}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
              title="Delete build"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
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
                  onClick={() => onEdit(build)}
                  className="text-sm text-red-700 dark:text-red-300 underline hover:no-underline font-medium"
                >
                  Update Personal Access Token
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading statistics...</p>
          </div>
        )}

        {/* Statistics */}
        {!loading && !error && stats && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Total Executions */}
              <div
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center"
                title="Total Executions (Last 7 days)"
              >
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-2">
                  Total
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.totalExecutions}
                </div>
              </div>

              {/* Successful */}
              <div
                className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center"
                title="Successful Executions (Last 7 days)"
              >
                <div className="text-xs text-green-700 dark:text-green-400 font-medium mb-2">
                  Success
                </div>
                <div className="text-3xl font-bold text-green-900 dark:text-green-300">
                  {stats.successfulExecutions}
                </div>
              </div>

              {/* Failed */}
              <div
                className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center"
                title="Failed Executions (Last 7 days)"
              >
                <div className="text-xs text-red-700 dark:text-red-400 font-medium mb-2">
                  Failed
                </div>
                <div className="text-3xl font-bold text-red-900 dark:text-red-300">
                  {stats.failedExecutions}
                </div>
              </div>

              {/* Health Badge */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex flex-col items-center justify-center text-center">
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-2">
                  Health
                </div>
                {stats.totalExecutions === 0 ? (
                  <div className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      Inactive
                    </span>
                  </div>
                ) : (
                  <div className={`text-2xl font-bold ${
                    stats.healthPercentage >= 90 
                      ? 'text-green-600 dark:text-green-400' 
                      : stats.healthPercentage >= 70 
                      ? 'text-yellow-600 dark:text-yellow-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {stats.healthPercentage}%
                  </div>
                )}
              </div>
            </div>

            {/* Additional Metrics - Commits & Contributors */}
            <div className="grid grid-cols-2 gap-3">
              {/* Commits Last 7 Days */}
              <div
                className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center border border-purple-200 dark:border-purple-800"
                title="Commits in the last 7 days"
              >
                <div className="text-xs text-purple-700 dark:text-purple-400 font-medium mb-1">
                  Commits (7d)
                </div>
                <div className="text-xl font-bold text-purple-900 dark:text-purple-300">
                  {stats.commitsLast7Days}
                </div>
              </div>

              {/* Contributors Last 7 Days */}
              <div
                className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center border border-orange-200 dark:border-orange-800"
                title="Unique contributors in the last 7 days"
              >
                <div className="text-xs text-orange-700 dark:text-orange-400 font-medium mb-1">
                  Contributors (7d)
                </div>
                <div className="text-xl font-bold text-orange-900 dark:text-orange-300">
                  {stats.contributorsLast7Days}
                </div>
              </div>
            </div>

            {/* Total Metrics - All Time */}
            <div className="grid grid-cols-2 gap-3">
              {/* Total Commits */}
              <div
                className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 text-center border border-indigo-200 dark:border-indigo-800"
                title="Total commits in repository (all time)"
              >
                <div className="text-xs text-indigo-700 dark:text-indigo-400 font-medium mb-1">
                  Total Commits
                </div>
                <div className="text-xl font-bold text-indigo-900 dark:text-indigo-300">
                  {stats.totalCommits.toLocaleString()}
                </div>
              </div>

              {/* Total Contributors */}
              <div
                className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3 text-center border border-cyan-200 dark:border-cyan-800"
                title="Total unique contributors (all time)"
              >
                <div className="text-xs text-cyan-700 dark:text-cyan-400 font-medium mb-1">
                  Total Contributors
                </div>
                <div className="text-xl font-bold text-cyan-900 dark:text-cyan-300">
                  {stats.totalContributors.toLocaleString()}
                </div>
              </div>
            </div>

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
                        title="View commit on GitHub"
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

            {/* Stacked Bar Chart - Last 7 Days */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Workflow Runs - Last 7 Days
              </h4>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-end justify-between gap-2 h-24">
                  {stats.last7DaysSuccesses.map((day, index) => {
                    const totalCount = day.successCount + (day.failureCount || 0);
                    const successHeightPercent = maxDailyTotal > 0 ? (day.successCount / maxDailyTotal) * 100 : 0;
                    const failureHeightPercent = maxDailyTotal > 0 ? ((day.failureCount || 0) / maxDailyTotal) * 100 : 0;

                    return (
                      <div key={index} className="flex flex-col items-center gap-2 flex-1">
                        {totalCount > 0 && (
                          <div className="text-xs font-bold text-gray-900 dark:text-white">
                            {totalCount}
                          </div>
                        )}
                        <div className="w-full flex flex-col items-center justify-end h-16 gap-0">
                          {/* Failures - on top (always rounded if present) */}
                          {(day.failureCount || 0) > 0 && (
                            <div
                              className="w-full bg-red-500 dark:bg-red-600 rounded-t transition-all hover:bg-red-600 dark:hover:bg-red-500 cursor-pointer relative group"
                              style={{ height: `${Math.max(failureHeightPercent, 8)}%` }}
                            >
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                {day.failureCount} failure{day.failureCount !== 1 ? 's' : ''}
                              </div>
                            </div>
                          )}
                          {/* Successes - on bottom (rounded only if no failures on top) */}
                          {day.successCount > 0 && (
                            <div
                              className={`w-full bg-green-500 dark:bg-green-600 transition-all hover:bg-green-600 dark:hover:bg-green-500 cursor-pointer relative group ${
                                (day.failureCount || 0) === 0 ? 'rounded-t' : ''
                              }`}
                              style={{ height: `${Math.max(successHeightPercent, 8)}%` }}
                            >
                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                                {day.successCount} success{day.successCount !== 1 ? 'es' : ''}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-green-500 dark:bg-green-600 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Success</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 bg-red-500 dark:bg-red-600 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Failed</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Accordion for Recent Runs */}
            {stats.recentRuns.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <button
                  onClick={() => setShowRecentRuns(!showRecentRuns)}
                  className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Recent Workflow Runs ({stats.recentRuns.length})
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
                      showRecentRuns ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>

                {showRecentRuns && (
                  <div className="mt-4 space-y-2">
                    {stats.recentRuns.map((run) => (
                      <a
                        key={run.id}
                        href={run.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg p-3 transition-colors"
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
                )}
              </div>
            )}

            {/* Accordion for Details */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Additional Details
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${
                    showDetails ? 'transform rotate-180' : ''
                  }`}
                />
              </button>

              {showDetails && (
                <div className="mt-4 space-y-6">
                  {/* Selectors */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Selectors
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {build.selectors.map((selector, index) => (
                        <div
                          key={index}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
                        >
                          <span className="text-gray-600 dark:text-gray-400">
                            {getSelectorIcon(selector.type)}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {selector.type}:
                          </span>
                          <span className="text-gray-700 dark:text-gray-300">
                            {selector.pattern}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Metadata
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <div>
                        <span className="font-medium">Cache Expiration:</span> {build.cacheExpirationMinutes} min
                      </div>
                      <div>
                        <span className="font-medium">Last Fetched:</span> {formatDate(stats.lastFetchedAt)}
                      </div>
                      <div>
                        <span className="font-medium">Avg Duration:</span>{' '}
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
                      </div>
                      <div>
                        <span className="font-medium">Created:</span> {formatDate(build.createdAt)}
                      </div>
                      <div>
                        <span className="font-medium">Updated:</span> {formatDate(build.updatedAt)}
                      </div>
                      <div>
                        <span className="font-medium">Success Rate:</span> {stats.healthPercentage}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



