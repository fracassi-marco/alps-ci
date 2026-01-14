'use client';

import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import type { AccessTokenResponse } from '@/domain/models';
import AddAccessTokenModal from './AddAccessTokenModal';
import DeleteAccessTokenDialog from './DeleteAccessTokenDialog';

export function TokenList() {
  const [tokens, setTokens] = useState<AccessTokenResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingToken, setEditingToken] = useState<AccessTokenResponse | null>(null);
  const [deletingToken, setDeletingToken] = useState<AccessTokenResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [buildsUsingToken, setBuildsUsingToken] = useState<string[]>([]);

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/tokens');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch tokens');
      }

      const data = await response.json();
      setTokens(data);
    } catch (err) {
      console.error('Failed to fetch tokens:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch GitHub tokens');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatLastUsed = (date: Date | string | null) => {
    if (!date) return 'Never';

    const now = new Date();
    const lastUsed = new Date(date);
    const diffMs = now.getTime() - lastUsed.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const handleSaveToken = async (name: string, token: string) => {
    if (editingToken) {
      // Update existing token
      const body: { name: string; token?: string } = { name };
      // Only include token if it's not empty (user wants to update it)
      if (token && token.trim()) {
        body.token = token;
      }

      const response = await fetch(`/api/tokens/${editingToken.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update token');
      }

      setEditingToken(null);
    } else {
      // Create new token
      const response = await fetch('/api/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, token }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create token');
      }

      setShowAddModal(false);
    }

    // Refresh the list
    await fetchTokens();
  };

  const handleEditClick = (token: AccessTokenResponse) => {
    setEditingToken(token);
  };

  const handleDeleteClick = (token: AccessTokenResponse) => {
    setDeletingToken(token);
    setBuildsUsingToken([]);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingToken) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/tokens/${deletingToken.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.status === 409) {
        // Token is in use by builds
        setBuildsUsingToken(data.buildsUsingToken || []);
        setIsDeleting(false);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete token');
      }

      // Success - close dialog and refresh list
      setDeletingToken(null);
      setBuildsUsingToken([]);
      await fetchTokens();
    } catch (err) {
      console.error('Failed to delete token:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete token');
      setDeletingToken(null);
      setBuildsUsingToken([]);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeletingToken(null);
    setBuildsUsingToken([]);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingToken(null);
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
        <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            No GitHub tokens saved yet. Add one to get started.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add GitHub Token
          </button>
        </div>
        <AddAccessTokenModal
          isOpen={showAddModal}
          onClose={handleCloseModal}
          onSave={handleSaveToken}
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add GitHub Token
        </button>
      </div>
      <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Last Used
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Created By
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Created
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {tokens.map((token) => (
            <tr key={token.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                {token.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {formatLastUsed(token.lastUsed)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {token.createdByName || 'Unknown'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                {formatDate(token.createdAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleEditClick(token)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center gap-1"
                    title="Edit token"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDeleteClick(token)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 inline-flex items-center gap-1"
                    title="Delete token"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      <AddAccessTokenModal
        isOpen={showAddModal || !!editingToken}
        onClose={handleCloseModal}
        onSave={handleSaveToken}
        editToken={editingToken}
      />
      <DeleteAccessTokenDialog
        isOpen={!!deletingToken}
        tokenName={deletingToken?.name || ''}
        buildsUsingToken={buildsUsingToken.length > 0 ? buildsUsingToken : undefined}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
}


