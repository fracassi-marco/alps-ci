'use client';

import { useState, useEffect } from 'react';
import { Plus, UserPlus, LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from '@/infrastructure/auth-client';
import { WelcomeScreen } from './components/WelcomeScreen';
import { AddEditBuildForm } from './components/AddEditBuildForm';
import { BuildCard } from './components/BuildCard';
import { ConfirmDialog } from './components/ConfirmDialog';
import { InviteMemberModal } from './components/InviteMemberModal';
import type { Build } from '@/domain/models';

export default function Home() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
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

  // Redirect to signin if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      router.push('/auth/signin');
    }
  }, [session, isPending, router]);

  // Fetch user's tenant information
  useEffect(() => {
    if (session) {
      fetchTenantInfo();
    }
  }, [session]);

  useEffect(() => {
    // Fetch builds on mount
    if (session && tenantId) {
      fetchBuilds();
    }
  }, [session, tenantId]);

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
      alert('Failed to delete build. Please try again.');
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
      alert(`✅ Invitation sent to ${email}!`);
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

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
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
                  {builds.length} build{builds.length !== 1 ? 's' : ''} configured
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Only show buttons for owners and admins */}
              {userRole && (userRole === 'owner' || userRole === 'admin') && (
                <>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                  >
                    <UserPlus className="w-5 h-5" />
                    Invite Member
                  </button>
                  <button
                    onClick={handleAddBuild}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Add Build
                  </button>
                </>
              )}

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowUserMenu(!showUserMenu);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span className="text-sm font-medium">{session.user?.name || session.user?.email}</span>
                </button>

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

      {/* Build Cards Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {builds.map((build) => (
            <BuildCard
              key={build.id}
              build={build}
              onEdit={handleEditBuild}
              onDelete={handleDeleteClick}
              onRefresh={handleRefresh}
            />
          ))}
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

      {/* Delete Confirmation Dialog */}
      {deletingBuild && !isDeleting && (
        <ConfirmDialog
          title="Delete Build?"
          message={`Are you sure you want to delete "${deletingBuild.name}"? This action cannot be undone. A backup will be created automatically.`}
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



