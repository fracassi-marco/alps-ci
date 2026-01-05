'use client';

import { useState, useEffect } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import type { Build } from '@/domain/models';

export default function Home() {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddBuildForm, setShowAddBuildForm] = useState(false);

  useEffect(() => {
    // Fetch builds on mount
    fetchBuilds();
  }, []);

  const fetchBuilds = async () => {
    try {
      const response = await fetch('/api/builds');
      if (response.ok) {
        const data = await response.json();
        setBuilds(data);
      }
    } catch (error) {
      console.error('Failed to fetch builds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBuild = () => {
    setShowAddBuildForm(true);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </main>
    );
  }

  // Show welcome screen if no builds exist
  if (builds.length === 0 && !showAddBuildForm) {
    return <WelcomeScreen onAddBuild={handleAddBuild} />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Alps-CI</h1>
        <p className="text-lg text-gray-600">
          CI Dashboard for GitHub Actions Workflows
        </p>
        {/* TODO: Show build list and add build form */}
        <div className="mt-8">
          <p className="text-gray-500">
            {builds.length} build(s) configured
          </p>
        </div>
      </div>
    </main>
  );
}



