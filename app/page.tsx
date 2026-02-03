'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, UserPlus, LogOut, User, LayoutGrid, LayoutList, Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from '@/infrastructure/auth-client';
import { toast } from './lib/toast';
import { WelcomeScreen } from './components/WelcomeScreen';
import { AddEditBuildForm } from './components/AddEditBuildForm';
import { BuildCard } from './components/BuildCard';
import { BuildListView } from './components/BuildListView';
import { ConfirmDialog } from './components/ConfirmDialog';
import Button from './components/Button';
import { InviteMemberModal } from './components/InviteMemberModal';
import { useViewMode } from './hooks/useViewMode';
import { groupBuildsByLabel } from '@/domain/utils';
import type { Build } from '@/domain/models';

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { viewMode, toggleViewMode, isClient } = useViewMode();
  const [builds, setBuilds] = useState<Build[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddBuildForm, setShowAddBuildForm] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingBuild, setEditingBuild] = useState<Build | null>(null);
  const [deletingBuild, setDeletingBuild] = useState<Build | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [buildRefreshKeys, setBuildRefreshKeys] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isSavingBuild, setIsSavingBuild] = useState(false);
  const [buildStatsCache, setBuildStatsCache] = useState<Record<string, { stats: any; error: string | null; loading: boolean }>>({});

  // Filter builds based on search query (name and repository only)
  const filteredBuilds = useMemo(() => {
    if (!searchQuery.trim()) {
      return builds;
    }

    const query = searchQuery.toLowerCase().trim();

    return builds.filter((build) => {
      const matchName = build.name.toLowerCase().includes(query);
      const matchRepo = build.repository.toLowerCase().includes(query);
      return matchName || matchRepo;
    });
  }, [builds, searchQuery]);

  // Group builds by label for grid view (must be before useEffect hooks)
  const groupedBuilds = useMemo(() => {
    return groupBuildsByLabel(filteredBuilds);
  }, [filteredBuilds]);

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      router.push('/auth/signin');
    }
  }, [session, isPending, router]);

  // Fetch tenant info and builds in parallel
  useEffect(() => {
    if (session) {
      fetchInitialData();
    }
  }, [session]);

  // Fetch batch stats when builds change
  useEffect(() => {
    if (builds.length > 0) {
      fetchBatchStats();
    }
  }, [builds.map(b => b.id).join(',')]);

  const fetchBatchStats = async () => {
    try {
      const buildIds = builds.map(b => b.id);
      
      // Initialize loading state
      const initialCache: Record<string, { stats: any; error: string | null; loading: boolean }> = {};
      builds.forEach(build => {
        if (!buildStatsCache[build.id]) {
          initialCache[build.id] = { stats: null, error: null, loading: true };
        }
      });
      setBuildStatsCache(prev => ({ ...prev, ...initialCache }));

      const response = await fetch('/api/builds/batch-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      
      // Update cache with results
      const updatedCache: Record<string, { stats: any; error: string | null; loading: boolean }> = {};
      builds.forEach(build => {
        const result = data[build.id];
        if (result) {
          updatedCache[build.id] = {
            stats: result.stats,
            error: result.error,
            loading: false,
          };
        }
      });
      setBuildStatsCache(prev => ({ ...prev, ...updatedCache }));
    } catch (error) {
      console.error('Failed to fetch batch stats:', error);
      // Set error for all builds
      const errorCache: Record<string, { stats: any; error: string | null; loading: boolean }> = {};
      builds.forEach(build => {
        errorCache[build.id] = { stats: null, error: 'Failed to fetch statistics', loading: false };
      });
      setBuildStatsCache(prev => ({ ...prev, ...errorCache }));
    }
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowUserMenu(false);
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

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

  const fetchInitialData = async () => {
    try {
      // Fetch tenant info and builds in parallel
      const [tenantResponse, buildsResponse] = await Promise.all([
        fetch('/api/user/tenant'),
        fetch('/api/builds')
      ]);

      // Process tenant info
      if (tenantResponse.ok) {
        const tenantData = await tenantResponse.json();
        setTenantId(tenantData.tenantId);
        setUserRole(tenantData.role);
      } else {
        console.error('Failed to fetch tenant info');
      }

      // Process builds
      if (buildsResponse.ok) {
        const buildsData = await buildsResponse.json();
        setBuilds(buildsData);
      } else {
        console.error('Failed to fetch builds');
      }
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const fetchTenantInfo = async () => {
    try {
      const response = await fetch('/api/user/tenant');
      if (!response.ok) {
        console.error('Failed to fetch tenant info');
        return;
      }

      const data = await response.json();
      setTenantId(data.tenantId);
      setUserRole(data.role);
    } catch (error) {
      console.error('Failed to fetch tenant info:', error);
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

  const handleSaveBuild = async (build: Partial<Build>) => {
    setIsSavingBuild(true);
    try {
      const url = editingBuild ? `/api/builds/${build.id}` : '/api/builds';
      const method = editingBuild ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(build),
      });

      if (response.ok) {
        const savedBuild = await response.json();

        // Refetch the builds list to show the new/updated build
        await fetchBuilds();

        // If creating a new build, show a toast notification about initial data fetch
        if (!editingBuild) {
          toast.success(`Build "${savedBuild.name}" created! Initial data is being fetched in the background.`);

          // Keep loading overlay visible for a brief moment to ensure 
          // BuildCard has time to mount and show the "Fetching initial data" banner
          await new Promise(resolve => setTimeout(resolve, 500));
        }

        // If editing an existing build, force refresh its statistics
        if (editingBuild && build.id) {
          // Increment the refresh key to force BuildCard remount
          setBuildRefreshKeys(prev => ({
            ...prev,
            [build.id!]: (prev[build.id!] || 0) + 1
          }));

          try {
            // Call POST endpoint to invalidate cache and fetch fresh data
            await fetch(`/api/builds/${build.id}/stats`, {
              method: 'POST',
            });
          } catch (refreshError) {
            console.warn('Failed to refresh build statistics:', refreshError);
            // Don't throw - the build was saved successfully
          }
        }

        setShowAddBuildForm(false);
        setEditingBuild(null);
      } else {
        throw new Error('Failed to save build');
      }
    } catch (error) {
      console.error('Failed to save build:', error);
      throw error;
    } finally {
      setIsSavingBuild(false);
    }
  };

  const handleCancelForm = () => {
    setShowAddBuildForm(false);
    setEditingBuild(null);
  };

  const handleDeleteClick = (build: Build) => {
    setDeletingBuild(build);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingBuild) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/builds/${deletingBuild.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove build from UI immediately
        setBuilds((prev) => prev.filter((b) => b.id !== deletingBuild.id));
        setDeletingBuild(null);
      } else {
        throw new Error('Failed to delete build');
      }
    } catch (error) {
      console.error('Failed to delete build:', error);
      toast.error('Failed to delete build. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingBuild(null);
  };

  const handleRefresh = async (build: Build) => {
    // Refresh is handled by the BuildCard component itself
    console.log('Refresh triggered for build:', build.name);
  };

  const handleInvite = async (email: string, role: string) => {
    try {
      if (!tenantId) {
        throw new Error('No tenant found. Please refresh the page.');
      }

      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId,
          email,
          role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      // Show success message
      toast.success(`Invitation sent to ${email}!`);
    } catch (error: any) {
      console.error('Failed to send invitation:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/auth/signin');
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
    return <WelcomeScreen onAddBuild={handleAddBuild} userRole={userRole} />;
  }

  // Show no results message if search returns nothing
  if (builds.length > 0 && filteredBuilds.length === 0 && searchQuery) {
    return (
      <main className="min-h-screen bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm">
        {/* Header */}
        <div className="bg-white/30 dark:bg-gray-800/30 border-b border-gray-200/30 dark:border-gray-700/30 sticky top-0 z-10 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-4xl">🏔</span>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Alps-CI
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    0 builds (filtered from {builds.length})
                  </p>
                </div>
              </div>

              {/* Search Input */}
              <div className="relative flex-1 max-w-md mx-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search builds..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 px-4 py-2 pl-10 pr-10 
                      border border-gray-300 dark:border-gray-600 
                      rounded-lg 
                      bg-white dark:bg-gray-700 
                      text-gray-900 dark:text-white
                      placeholder-gray-500 dark:placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                      transition-colors"
                    aria-label="Search builds by name or repository"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      aria-label="Clear search"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
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

        {/* Empty State */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <Search className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No builds found
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              No builds match &quot;{searchQuery}&quot;. Try a different search term.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-200 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Clear search
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm">
      {/* Header */}
      <div className="bg-white/30 dark:bg-gray-800/30 border-b border-gray-200/30 dark:border-gray-700/30 sticky top-0 z-10 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🏔</span>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Alps-CI
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {filteredBuilds.length} build{filteredBuilds.length !== 1 ? 's' : ''} configured
                  {searchQuery && builds.length !== filteredBuilds.length && ` (filtered from ${builds.length})`}
                </p>
              </div>
            </div>

            {/* Search Input - only show when builds exist */}
            {builds.length > 0 && (
              <div className="relative flex-1 max-w-md mx-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search builds..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-64 px-4 py-2 pl-10 pr-10 
                      border border-gray-300 dark:border-gray-600 
                      rounded-lg 
                      bg-white dark:bg-gray-700 
                      text-gray-900 dark:text-white
                      placeholder-gray-500 dark:placeholder-gray-400
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                      transition-colors"
                    aria-label="Search builds by name or repository"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      aria-label="Clear search"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              {builds.length > 0 && isClient && (
                <Button
                  onClick={toggleViewMode}
                  variant="secondary"
                  title={viewMode === 'grid' ? 'Switch to List View' : 'Switch to Grid View'}
                  aria-label={viewMode === 'grid' ? 'Switch to List View' : 'Switch to Grid View'}
                  className="px-3"
                >
                  {viewMode === 'grid' ? <LayoutList className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
                </Button>
              )}

              {/* Only show buttons for owners and admins */}
              {userRole && (userRole === 'owner' || userRole === 'admin') && (
                <>
                  <Button
                    onClick={() => setShowInviteModal(true)}
                    variant="secondary"
                    icon={<UserPlus className="w-5 h-5" />}
                  >
                    Invite Member
                  </Button>
                  <Button
                    onClick={handleAddBuild}
                    icon={<Plus className="w-5 h-5" />}
                    variant="primary"
                  >
                    Add Build
                  </Button>
                </>
              )}

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

      {/* Builds Display */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Grid View with Grouped Labels */}
        {viewMode === 'grid' && (
          <div className="space-y-8">
            {Array.from(groupedBuilds.entries()).map(([labelKey, buildsInGroup]) => {
              // Determine display label
              const displayLabel = labelKey === '' ? 'Unlabeled' :
                buildsInGroup[0]?.label || 'Unlabeled';

              return (
                <div key={labelKey || 'unlabeled'} className="space-y-4">
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

                  {/* Builds Grid */}
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {buildsInGroup.map((build) => {
                      const cachedData = buildStatsCache[build.id];
                      return (
                        <BuildCard
                          key={`${build.id}-${buildRefreshKeys[build.id] || 0}`}
                          build={build}
                          onEdit={handleEditBuild}
                          onDelete={handleDeleteClick}
                          onRefresh={handleRefresh}
                          initialStats={cachedData?.stats}
                          initialError={cachedData?.error}
                          initialLoading={cachedData?.loading ?? true}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* List View */}
        {viewMode === 'list' && (
          <BuildListView
            key={Object.values(buildRefreshKeys).join('-')}
            builds={filteredBuilds}
            onRefresh={handleRefresh}
            onEdit={handleEditBuild}
            onDelete={handleDeleteClick}
          />
        )}
      </div>

      {/* Add/Edit Build Form */}
      {showAddBuildForm && (
        <AddEditBuildForm
          build={editingBuild || undefined}
          onSave={handleSaveBuild}
          onCancel={handleCancelForm}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingBuild && !isDeleting && (
        <ConfirmDialog
          title="Delete Build?"
          message={`Are you sure you want to delete "${deletingBuild.name}"? This action cannot be undone.`}
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

      {/* Saving Build Overlay */}
      {isSavingBuild && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              {editingBuild ? 'Updating build...' : 'Creating build and fetching initial data...'}
            </p>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteModal && (
        <InviteMemberModal
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInvite}
        />
      )}
    </main>
  );
}



