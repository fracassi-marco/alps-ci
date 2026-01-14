'use client';

import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import type { AccessTokenResponse } from '@/domain/models';

interface AddAccessTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, token: string) => Promise<void>;
  editToken?: AccessTokenResponse | null;
}

export default function AddAccessTokenModal({
  isOpen,
  onClose,
  onSave,
  editToken,
}: AddAccessTokenModalProps) {
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditMode = !!editToken;

  // Pre-fill form when editing
  useEffect(() => {
    if (editToken) {
      setName(editToken.name);
      setToken(''); // Don't pre-fill token for security
    } else {
      setName('');
      setToken('');
    }
    setShowToken(false);
    setError(null);
  }, [editToken, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    // In edit mode, token is optional (only update if provided)
    // In add mode, token is required
    if (!isEditMode && !token.trim()) {
      setError('Token is required');
      return;
    }

    setIsSaving(true);
    try {
      await onSave(name.trim(), token.trim());
      // Reset form
      setName('');
      setToken('');
      setShowToken(false);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save token');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setName('');
      setToken('');
      setShowToken(false);
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditMode ? 'Edit GitHub Token' : 'Add GitHub Token'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Name Input */}
          <div>
            <label htmlFor="token-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              id="token-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Production Token"
              maxLength={100}
              disabled={isSaving}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              A descriptive name to identify this token
            </p>
          </div>

          {/* Token Input */}
          <div>
            <label htmlFor="token-value" className="block text-sm font-medium text-gray-700 mb-1">
              GitHub Personal Access Token {isEditMode ? '(Optional - leave empty to keep current)' : '*'}
            </label>
            <div className="relative">
              <input
                id="token-value"
                type={showToken ? 'text' : 'password'}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={isEditMode ? 'Enter new token to replace...' : 'ghp_xxxxxxxxxxxxxxxxxxxx'}
                disabled={isSaving}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                disabled={isSaving}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              >
                {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isEditMode
                ? 'Leave empty to keep the existing token, or enter a new one to replace it'
                : 'This token will be encrypted and stored securely'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSaving}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim() || (!isEditMode && !token.trim())}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : (isEditMode ? 'Update Token' : 'Save Token')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

