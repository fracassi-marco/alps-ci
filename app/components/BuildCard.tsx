'use client';

import { Trash2, Edit, RefreshCw, GitBranch, Tag, Workflow } from 'lucide-react';
import type { Build, Selector } from '@/domain/models';

interface BuildCardProps {
  build: Build;
  onEdit: (build: Build) => void;
  onDelete: (build: Build) => void;
  onRefresh: (build: Build) => void;
}

export function BuildCard({ build, onEdit, onDelete, onRefresh }: BuildCardProps) {
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            {build.name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {build.organization}/{build.repository}
          </p>
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => onRefresh(build)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => onEdit(build)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Edit build"
          >
            <Edit className="w-5 h-5" />
          </button>
          <button
            onClick={() => onDelete(build)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete build"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Selectors */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
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

      {/* Cache Expiration */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
          Cache Expiration
        </h4>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {build.cacheExpirationMinutes} minute{build.cacheExpirationMinutes !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Metadata */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div>
          Created: {formatDate(build.createdAt)}
        </div>
        <div>
          Updated: {formatDate(build.updatedAt)}
        </div>
      </div>

      {/* TODO: Add statistics when available */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          Statistics will be displayed here (Step 7)
        </p>
      </div>
    </div>
  );
}

