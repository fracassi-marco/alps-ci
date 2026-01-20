'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  Edit,
  Trash2,
  ExternalLink,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  GitBranch,
  Tag,
  Workflow,
  GitCommit,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { Build, BuildStats, Selector } from '@/domain/models';
import { ConfirmDialog } from './ConfirmDialog';
import { Tooltip } from './Tooltip';
import { groupBuildsByLabel } from '@/domain/utils';
import React from "react";

interface BuildListViewProps {
  builds: Build[];
  onRefresh: (build: Build) => void;
  onEdit: (build: Build) => void;
  onDelete: (build: Build) => void;
}

interface BuildWithStats {
  build: Build;
  stats: BuildStats | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
}

export function BuildListView({ builds, onRefresh, onEdit, onDelete }: BuildListViewProps) {
  const router = useRouter();
  const [buildStatsMap, setBuildStatsMap] = useState<Map<string, BuildWithStats>>(new Map());
  const [deleteTarget, setDeleteTarget] = useState<Build | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Memoize build IDs to prevent unnecessary effect triggers
  const buildIds = useMemo(() => builds.map(b => b.id).join(','), [builds]);

  // Group builds by label
  const groupedBuilds = useMemo(() => {
    return groupBuildsByLabel(builds);
  }, [builds]);

  const fetchStats = useCallback(async (build: Build) => {
    try {
      const response = await fetch(`/api/builds/${build.id}/stats`);

      if (response.status === 401) {
        const data = await response.json();
        setBuildStatsMap((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(build.id);
          if (existing) {
            newMap.set(build.id, {
              ...existing,
              error: data.error,
              stats: null,
              loading: false,
            });
          }
          return newMap;
        });
      } else if (response.ok) {
        const data = await response.json();
        setBuildStatsMap((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(build.id);
          if (existing) {
            newMap.set(build.id, {
              ...existing,
              stats: data,
              error: null,
              loading: false,
            });
          }
          return newMap;
        });
      } else {
        throw new Error('Failed to fetch statistics');
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
      setBuildStatsMap((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(build.id);
        if (existing) {
          newMap.set(build.id, {
            ...existing,
            error: 'Failed to fetch statistics',
            loading: false,
          });
        }
        return newMap;
      });
    }
  }, []);

  useEffect(() => {
    // Initialize stats for all builds
    builds.forEach((build) => {
      setBuildStatsMap((prev) => {
        // Only initialize if not already present
        if (!prev.has(build.id)) {
          const newMap = new Map(prev);
          newMap.set(build.id, {
            build,
            stats: null,
            error: null,
            loading: true,
            refreshing: false,
          });
          // Fetch stats after setting initial state
          fetchStats(build);
          return newMap;
        }
        return prev; // No change if already exists
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildIds, fetchStats]);

  const handleRefresh = async (build: Build) => {
    setBuildStatsMap((prev) => {
      const newMap = new Map(prev);
      const existing = newMap.get(build.id);
      if (existing) {
        newMap.set(build.id, { ...existing, refreshing: true });
      }
      return newMap;
    });

    try {
      const response = await fetch(`/api/builds/${build.id}/stats`, {
        method: 'POST',
      });

      if (response.status === 401) {
        const data = await response.json();
        setBuildStatsMap((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(build.id);
          if (existing) {
            newMap.set(build.id, {
              ...existing,
              error: data.error,
              stats: null,
              refreshing: false,
            });
          }
          return newMap;
        });
      } else if (response.ok) {
        const data = await response.json();
        setBuildStatsMap((prev) => {
          const newMap = new Map(prev);
          const existing = newMap.get(build.id);
          if (existing) {
            newMap.set(build.id, {
              ...existing,
              stats: data,
              error: null,
              refreshing: false,
            });
          }
          return newMap;
        });
      } else {
        throw new Error('Failed to refresh statistics');
      }
    } catch (err) {
      console.error('Error refreshing stats:', err);
      setBuildStatsMap((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(build.id);
        if (existing) {
          newMap.set(build.id, {
            ...existing,
            error: 'Failed to refresh statistics',
            refreshing: false,
          });
        }
        return newMap;
      });
    }
    onRefresh(build);
  };

  const getHealthBadge = (stats: BuildStats | null) => {
    if (!stats || stats.totalExecutions === 0) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
          Inactive
        </span>
      );
    }

    const percentage = stats.healthPercentage;
    let colorClass: string;

    if (percentage >= 80) {
      colorClass = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
    } else if (percentage >= 50) {
      colorClass = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
    } else {
      colorClass = 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}
      >
        {percentage.toFixed(0)}%
      </span>
    );
  };

  const formatRelativeTime = (date: Date | undefined) => {
    if (!date) return '—';

    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'Just now';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    }

    return then.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const toggleExpanded = (buildId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(buildId)) {
        next.delete(buildId);
      } else {
        next.add(buildId);
      }
      return next;
    });
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

  const handleDeleteClick = (build: Build) => {
    setDeleteTarget(build);
  };

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      onDelete(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteTarget(null);
  };

  return (
    <>
      <div className="space-y-8">
        {Array.from(groupedBuilds.entries()).map(([labelKey, buildsInGroup]) => {
          // Determine display label
          const displayLabel = labelKey === '' ? 'Unlabeled' :
            buildsInGroup[0]?.label || 'Unlabeled';

          return (
            <div key={labelKey || 'unlabeled'}>
              {/* Group Header */}
              <div className="bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600 py-3 px-4 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {displayLabel}
                  </h2>
                  <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                    {buildsInGroup.length}
                  </span>
                </div>
              </div>

              {/* Builds Table */}
              <div className="bg-white dark:bg-gray-800 rounded-b-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Health
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          7-Day Stats
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Last Tag
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Last Run
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {buildsInGroup.map((build) => {
                const buildData = buildStatsMap.get(build.id);
                const stats = buildData?.stats ?? null;
                const error = buildData?.error ?? null;
                const loading = buildData?.loading ?? true;
                const refreshing = buildData?.refreshing ?? false;
                const isExpanded = expandedRows.has(build.id);

                const lastRun = stats?.recentRuns?.[0];
                const maxDailyTotal = stats
                  ? Math.max(...stats.last7DaysSuccesses.map((d) => d.successCount + (d.failureCount || 0)), 1)
                  : 1;

                return (
                  <React.Fragment key={build.id}>
                    {/* Main Row */}
                    <tr
                      key={build.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      {/* Name */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {build.name}
                          </div>
                          <a
                            href={`https://github.com/${build.organization}/${build.repository}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline inline-flex items-center gap-1"
                            title="Open repository on GitHub"
                          >
                            {build.organization}/{build.repository}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          {error && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                              <AlertCircle className="w-3 h-3" />
                              <span>Token error</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Health */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {loading ? (
                          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-5 w-16 rounded-full"></div>
                        ) : (
                          getHealthBadge(stats)
                        )}
                      </td>

                      {/* 7-Day Stats */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {loading ? (
                          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-24 rounded"></div>
                        ) : stats ? (
                          <Tooltip content="Total / Successful / Failed executions in last 7 days">
                            <span className="text-sm text-gray-900 dark:text-gray-100 cursor-help border-b border-dashed border-gray-400 dark:border-gray-500">
                              {stats.totalExecutions} / {stats.successfulExecutions} / {stats.failedExecutions}
                            </span>
                          </Tooltip>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </td>

                      {/* Last Tag */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {loading ? (
                          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-20 rounded"></div>
                        ) : stats?.lastTag ? (
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {stats.lastTag}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </td>

                      {/* Last Run */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {loading ? (
                          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 w-28 rounded"></div>
                        ) : lastRun ? (
                          <span className="text-sm text-gray-900 dark:text-gray-100">
                            {formatRelativeTime(lastRun.createdAt)}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500 dark:text-gray-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleExpanded(build.id)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            title={isExpanded ? 'Collapse details' : 'Expand details'}
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRefresh(build)}
                            disabled={refreshing || loading}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Refresh data"
                          >
                            <RefreshCw
                              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                            />
                          </button>
                          <button
                            onClick={() => onEdit(build)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            title="Edit build"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(build)}
                            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                            title="Delete build"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {isExpanded && !loading && stats && (
                      <tr key={`${build.id}-expanded`}>
                        <td colSpan={6} className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
                          <div className="space-y-4">
                            {/* 7-Day Bar Chart */}
                            <div>
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                Last 7 Days Activity
                              </h4>
                              <div className="flex items-end justify-between gap-2 h-32">
                                {stats.last7DaysSuccesses.map((day) => {
                                  const total = day.successCount + (day.failureCount || 0);
                                  const successHeight = total > 0 ? (day.successCount / maxDailyTotal) * 100 : 0;
                                  const failureHeight = total > 0 ? ((day.failureCount || 0) / maxDailyTotal) * 100 : 0;

                                  return (
                                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                                      <div className="w-full flex flex-col justify-end h-24 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden relative group">
                                        {day.successCount > 0 && (
                                          <div
                                            className="w-full bg-green-500 dark:bg-green-600 transition-all relative"
                                            style={{ height: `${successHeight}%` }}
                                            title={`${day.successCount} successful`}
                                          >
                                            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                              {day.successCount}
                                            </span>
                                          </div>
                                        )}
                                        {(day.failureCount || 0) > 0 && (
                                          <div
                                            className="w-full bg-red-500 dark:bg-red-600 transition-all relative"
                                            style={{ height: `${failureHeight}%` }}
                                            title={`${day.failureCount} failed`}
                                          >
                                            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                              {day.failureCount}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                      <span className="text-xs text-gray-600 dark:text-gray-400">
                                        {new Date(day.date).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                        })}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Test Statistics */}
                            {stats.testStats && stats.recentRuns.length > 0 && (
                              <button
                                onClick={() => router.push(`/builds/${build.id}/tests/${stats.recentRuns[0]!.id}`)}
                                className="w-full bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors cursor-pointer group text-left"
                                title="View test results details"
                              >
                                <div className="flex items-center gap-2 mb-3">
                                  <h4 className="text-sm font-semibold text-purple-700 dark:text-purple-300 group-hover:underline">
                                    Test Results (Last Run)
                                  </h4>
                                  <ExternalLink className="w-4 h-4 text-purple-600 dark:text-purple-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                  <div className="text-center">
                                    <div className="text-xs text-purple-600 dark:text-purple-400 mb-1">Total</div>
                                    <div className="text-xl font-bold text-purple-900 dark:text-purple-200">
                                      {stats.testStats.totalTests}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-green-600 dark:text-green-400 mb-1">Passed</div>
                                    <div className="text-xl font-bold text-green-700 dark:text-green-300">
                                      {stats.testStats.passedTests}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-red-600 dark:text-red-400 mb-1">Failed</div>
                                    <div className="text-xl font-bold text-red-700 dark:text-red-300">
                                      {stats.testStats.failedTests}
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Skipped</div>
                                    <div className="text-xl font-bold text-gray-700 dark:text-gray-300">
                                      {stats.testStats.skippedTests}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            )}

                            {/* Recent Workflow Runs */}
                            {stats.recentRuns.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                  Recent Workflow Runs
                                </h4>
                                <div className="space-y-1">
                                  {stats.recentRuns.slice(0, 3).map((run) => (
                                    <a
                                      key={run.id}
                                      href={run.htmlUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-sm"
                                    >
                                      {run.status === 'success' ? (
                                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                                      ) : (
                                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                                      )}
                                      <span className="text-gray-900 dark:text-gray-100 flex-1 truncate">
                                        {run.name}
                                      </span>
                                      <span className="text-gray-500 dark:text-gray-400 text-xs">
                                        {formatRelativeTime(run.createdAt)}
                                      </span>
                                      <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Repository Insights */}
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                  Last 7 Days
                                </h4>
                                <div className="space-y-1 text-sm">
                                  <div key="7d-commits" className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Commits:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {stats.commitsLast7Days}
                                    </span>
                                  </div>
                                  <div key="7d-contributors" className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Contributors:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {stats.contributorsLast7Days}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                  All Time
                                </h4>
                                <div className="space-y-1 text-sm">
                                  <div key="total-commits" className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Commits:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {stats.totalCommits}
                                    </span>
                                  </div>
                                  <div key="total-contributors" className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Contributors:</span>
                                    <span className="font-medium text-gray-900 dark:text-gray-100">
                                      {stats.totalContributors}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Last Commit */}
                            {stats.lastCommit && (
                              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                  Last Commit
                                </h4>
                                <div className="space-y-1 text-sm">
                                  <div className="flex items-start gap-2">
                                    <GitCommit className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-gray-900 dark:text-gray-100 truncate">
                                        {stats.lastCommit.message}
                                      </p>
                                      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        <span>{stats.lastCommit.author}</span>
                                        <span>{formatDate(stats.lastCommit.date)}</span>
                                        <a
                                          href={stats.lastCommit.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline"
                                        >
                                          {stats.lastCommit.sha.slice(0, 7)}
                                        </a>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Selectors */}
                            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Selectors
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {build.selectors.map((selector, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-sm"
                                  >
                                    {getSelectorIcon(selector.type)}
                                    <span className="text-gray-700 dark:text-gray-300 capitalize">
                                      {selector.type}:
                                    </span>
                                    <span className="font-mono text-gray-900 dark:text-gray-100">
                                      {selector.pattern}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
          );
        })}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete Build?"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This action will create a backup but cannot be undone from the UI.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          isDestructive
        />
      )}
    </>
  );
}

