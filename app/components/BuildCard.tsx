'use client';

import { useState, useEffect } from 'react';
import {
  Trash2,
  Edit,
  RefreshCw,
  GitBranch,
  Tag,
  Workflow,
  TrendingUp,
  TrendingDown,
  Activity,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import type { Build, Selector, BuildStats } from '@/domain/models';
import { getHealthBadgeColor } from '@/domain/utils';

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

  const getHealthBadge = (percentage: number) => {
    const color = getHealthBadgeColor(percentage);
    const bgColorMap = {
      green: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-300 dark:border-green-700',
      yellow: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700',
      red: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-red-300 dark:border-red-700',
    };

    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 font-bold text-lg ${bgColorMap[color]}`}>
        {percentage >= 90 ? (
          <CheckCircle className="w-5 h-5" />
        ) : percentage >= 70 ? (
          <Activity className="w-5 h-5" />
        ) : (
          <XCircle className="w-5 h-5" />
        )}
        {percentage}% Health
      </div>
    );
  };

  const maxSuccessCount = stats ? Math.max(...stats.last7DaysSuccesses.map((d) => d.successCount), 1) : 1;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 dark:from-indigo-700 dark:to-blue-700 px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-1">
              {build.name}
            </h3>
            <p className="text-indigo-100">
              {build.organization}/{build.repository}
            </p>
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
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
                  <Activity className="w-4 h-4" />
                  Total Executions
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalExecutions}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Last 7 days
                </div>
              </div>

              {/* Successful */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm mb-1">
                  <TrendingUp className="w-4 h-4" />
                  Successful
                </div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-300">
                  {stats.successfulExecutions}
                </div>
                <div className="text-xs text-green-600 dark:text-green-500 mt-1">
                  Last 7 days
                </div>
              </div>

              {/* Failed */}
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm mb-1">
                  <TrendingDown className="w-4 h-4" />
                  Failed
                </div>
                <div className="text-2xl font-bold text-red-900 dark:text-red-300">
                  {stats.failedExecutions}
                </div>
                <div className="text-xs text-red-600 dark:text-red-500 mt-1">
                  Last 7 days
                </div>
              </div>

              {/* Health Badge */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 flex items-center justify-center">
                {getHealthBadge(stats.healthPercentage)}
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

            {/* Bar Chart - Last 7 Days Successes */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Successful Runs - Last 7 Days
              </h4>
              <div className="flex items-end gap-2 h-32">
                {stats.last7DaysSuccesses.map((day, index) => {
                  const height = maxSuccessCount > 0 ? (day.successCount / maxSuccessCount) * 100 : 0;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-xs font-medium text-gray-900 dark:text-white">
                        {day.successCount}
                      </div>
                      <div
                        className="w-full bg-green-500 dark:bg-green-600 rounded-t transition-all hover:bg-green-600 dark:hover:bg-green-500"
                        style={{ height: `${Math.max(height, day.successCount > 0 ? 8 : 0)}%` }}
                        title={`${day.date}: ${day.successCount} successes`}
                      ></div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Runs */}
            {stats.recentRuns.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Recent Workflow Runs
                </h4>
                <div className="space-y-2">
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
              </div>
            )}

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
  );
}



