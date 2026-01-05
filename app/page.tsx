'use client';

import { useState, useEffect } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { AddEditBuildForm } from './components/AddEditBuildForm';
import type { Build } from '@/domain/models';

export default function Home() {
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddBuildForm, setShowAddBuildForm] = useState(false);
  const [editingBuild, setEditingBuild] = useState<Build | null>(null);

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
    setEditingBuild(null);
  };

  const handleEditBuild = (build: Build) => {
    setEditingBuild(build);
    setShowAddBuildForm(true);
  };

  const handleSaveBuild = async (build: Build) => {
    try {
      const url = editingBuild ? `/api/builds/${build.id}` : '/api/builds';
      const method = editingBuild ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(build),
      });

      if (response.ok) {
        await fetchBuilds();
        setShowAddBuildForm(false);
        setEditingBuild(null);
      } else {
        throw new Error('Failed to save build');
      }
    } catch (error) {
      console.error('Failed to save build:', error);
      throw error;
    }
  };

  const handleCancelForm = () => {
    setShowAddBuildForm(false);
    setEditingBuild(null);
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

  // Show welcome screen if no builds exist and form is not shown
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
        {/* TODO: Show build list */}
        <div className="mt-8">
          <p className="text-gray-500">
            {builds.length} build(s) configured
          </p>
          <button
            onClick={handleAddBuild}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Add Build
          </button>
        </div>
      </div>

      {/* Add/Edit Build Form */}
      {showAddBuildForm && (
        <AddEditBuildForm
          build={editingBuild || undefined}
          onSave={handleSaveBuild}
          onCancel={handleCancelForm}
        />
      )}
    </main>
  );
}



