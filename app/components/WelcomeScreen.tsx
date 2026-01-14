'use client';

import { PlusCircle, GitBranch, BarChart3 } from 'lucide-react';
import Button from './Button';

interface WelcomeScreenProps {
  onAddBuild: () => void;
  userRole?: 'owner' | 'admin' | 'member' | null;
}

export function WelcomeScreen({ onAddBuild, userRole }: WelcomeScreenProps) {
  const canAddBuilds = userRole === 'owner' || userRole === 'admin';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-4xl w-full">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="text-8xl mb-6">
            🏔
          </div>
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to Alps-CI
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Monitor and track your GitHub Actions workflows with beautiful dashboards and real-time statistics.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg mb-4">
              <GitBranch className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Track Workflows
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Monitor workflow runs across multiple repositories with customizable selectors for branches, tags, and workflow names.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg mb-4">
              <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              View Statistics
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Get insights with success rates, health badges, execution trends, and detailed metrics for the last 7 days.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg mb-4">
              <PlusCircle className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Easy Setup
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Add builds quickly with your GitHub Personal Access Token. Configure cache expiration and start monitoring immediately.
            </p>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Getting Started
          </h2>
          <div className="space-y-4 mb-8">
            <div className="flex items-start">
              <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 text-white rounded-full font-semibold mr-4 shrink-0">
                1
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Create a GitHub Personal Access Token
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Go to GitHub Settings → Developer settings → Personal access tokens → Generate new token.
                  Grant <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">repo</code> and{' '}
                  <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">workflow</code> permissions.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 text-white rounded-full font-semibold mr-4 shrink-0">
                2
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Add Your First Build
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Click the button below to add a new Build. Provide your repository details, Access Token, and configure selectors to filter workflows.
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center justify-center w-8 h-8 bg-indigo-600 text-white rounded-full font-semibold mr-4 shrink-0">
                3
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Monitor Your Workflows
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  View real-time statistics, success rates, and recent runs. Refresh data manually or let the cache handle updates automatically.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Button - Only show for owners and admins */}
          {canAddBuilds ? (
            <Button
              onClick={onAddBuild}
              icon={<PlusCircle className="w-6 h-6" />}
              size="lg"
              fullWidth
              className="bg-indigo-600 hover:bg-indigo-700 shadow-lg hover:shadow-xl text-lg py-4"
            >
              Add Your First Build
            </Button>
          ) : (
            <div className="text-center py-4 px-6 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <p className="text-gray-600 dark:text-gray-400">
                You need owner or admin permissions to add builds. Please contact your organization owner.
              </p>
            </div>
          )}
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
          Your configuration is stored locally in <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">data/config.json</code>
        </p>
      </div>
    </div>
  );
}

