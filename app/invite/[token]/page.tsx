'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface InvitationDetails {
  email: string;
  role: string;
  expiresAt: string;
  isExpired: boolean;
  isAccepted: boolean;
}

export default function AcceptInvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => {
      setToken(p.token);
    });
  }, []);

  useEffect(() => {
    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const fetchInvitation = async () => {
    if (!token) return;

    try {
      const response = await fetch(`/api/invitations/${token}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load invitation');
      }

      setInvitation(data.invitation);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    setError('');

    try {
      // TODO: Get userId from session
      // For now, redirect to sign in/register
      router.push(`/auth/signin?invite=${token}`);
    } catch (err: any) {
      setError(err.message);
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Invalid Invitation
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error || 'This invitation link is not valid'}
          </p>
          <a
            href="/"
            className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Go to homepage
          </a>
        </div>
      </div>
    );
  }

  if (invitation.isAccepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Already Accepted
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This invitation has already been accepted
          </p>
          <a
            href="/auth/signin"
            className="inline-block px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Sign in
          </a>
        </div>
      </div>
    );
  }

  if (invitation.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">⏰</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Invitation Expired
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This invitation has expired. Please ask for a new invitation.
          </p>
          <a
            href="/"
            className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
          >
            Go to homepage
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏔️</div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            You're Invited!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Join your team on Alps-CI
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <div className="space-y-4">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Email</span>
              <p className="text-gray-900 dark:text-white font-medium">{invitation.email}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Role</span>
              <p className="text-gray-900 dark:text-white font-medium capitalize">
                {invitation.role}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">Expires</span>
              <p className="text-gray-900 dark:text-white font-medium">
                {new Date(invitation.expiresAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {accepting ? 'Accepting...' : 'Accept Invitation'}
        </button>

        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          By accepting, you'll be able to sign in or create an account
        </p>
      </div>
    </div>
  );
}

