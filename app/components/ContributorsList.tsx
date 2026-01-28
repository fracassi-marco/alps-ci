'use client';

import { Users } from 'lucide-react';
import type { Contributor } from '@/domain/models';

interface ContributorsListProps {
  contributors: Contributor[];
}

export function ContributorsList({ contributors }: ContributorsListProps) {
  if (contributors.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Top Contributors
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          ({contributors.length})
        </span>
      </div>

      <div className="space-y-1">
        {contributors.map((contributor, index) => (
          <a
            key={contributor.login}
            href={contributor.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
          >
            {/* Rank */}
            <div className="flex-shrink-0 w-8 text-center">
              <span className="text-sm font-bold text-gray-500 dark:text-gray-400">
                #{index + 1}
              </span>
            </div>

            {/* Avatar */}
            <div className="flex-shrink-0">
              <img
                src={contributor.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(contributor.name || contributor.login)}&background=6366f1&color=fff&size=40`}
                alt={contributor.login}
                className="w-10 h-10 rounded-full border-2 border-gray-200 dark:border-gray-600"
              />
            </div>

            {/* Name and login */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {contributor.name || contributor.login}
              </div>
              {contributor.name && (
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  @{contributor.login}
                </div>
              )}
            </div>

            {/* Contributions */}
            <div className="flex-shrink-0 text-right">
              <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {contributor.contributions.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                commits
              </div>
            </div>
          </a>
        ))}
      </div>

      {contributors.length >= 50 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
          Showing top 50 contributors
        </div>
      )}
    </div>
  );
}
