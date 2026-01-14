'use client';

import { X, AlertTriangle } from 'lucide-react';

interface DeleteAccessTokenDialogProps {
  isOpen: boolean;
  tokenName: string;
  buildsUsingToken?: string[];
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteAccessTokenDialog({
  isOpen,
  tokenName,
  buildsUsingToken,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteAccessTokenDialogProps) {
  if (!isOpen) return null;

  const hasBuildsUsing = buildsUsingToken && buildsUsingToken.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Delete GitHub Token?
          </h2>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {hasBuildsUsing ? (
            <>
              {/* Warning - Token in use */}
              <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Cannot delete this token
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                    This token is currently being used by the following builds:
                  </p>
                </div>
              </div>

              {/* List of builds using the token */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4">
                <ul className="list-disc list-inside space-y-1">
                  {buildsUsingToken.map((buildName, index) => (
                    <li key={index} className="text-sm text-gray-700 dark:text-gray-300">
                      {buildName}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-400">
                To delete this token, please first update or remove the builds that are using it.
              </p>
            </>
          ) : (
            <>
              {/* Confirmation - Token not in use */}
              <p className="text-gray-600 dark:text-gray-400">
                Are you sure you want to delete the token <strong className="text-gray-900 dark:text-white">{tokenName}</strong>?
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This action cannot be undone.
              </p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {hasBuildsUsing ? 'Close' : 'Cancel'}
          </button>
          {!hasBuildsUsing && (
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? 'Deleting...' : 'Delete Token'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

