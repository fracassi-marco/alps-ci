'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from '@/infrastructure/auth-client';
import { Users, Mail, UserCheck, X, AlertCircle, User, LogOut, Key } from 'lucide-react';
import { TokenList } from '../components/TokenList';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

interface Invitation {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  invitedBy: string;
  expiresAt: string;
}

export default function OrganizationPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [organizationName, setOrganizationName] = useState<string>('');
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [invitationToRevoke, setInvitationToRevoke] = useState<Invitation | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showRoleChangeDialog, setShowRoleChangeDialog] = useState(false);
  const [roleChangeData, setRoleChangeData] = useState<{
    member: Member;
    newRole: 'owner' | 'admin' | 'member';
  } | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isPending && !session) {
      router.push('/auth/signin');
    }
  }, [session, isPending, router]);

  // Fetch organization data
  useEffect(() => {
    if (session) {
      fetchOrganizationData();
    }
  }, [session]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowUserMenu(false);
    if (showUserMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showUserMenu]);

  const fetchOrganizationData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch tenant info
      const tenantResponse = await fetch('/api/user/tenant');
      if (!tenantResponse.ok) throw new Error('Failed to fetch organization info');
      const tenantData = await tenantResponse.json();
      setUserRole(tenantData.role);

      // Store current user ID from session
      if (session?.user?.id) {
        setCurrentUserId(session.user.id);
      }

      // Fetch tenant details
      const orgResponse = await fetch(`/api/organization/${tenantData.tenantId}`);
      if (!orgResponse.ok) throw new Error('Failed to fetch organization details');
      const orgData = await orgResponse.json();
      setOrganizationName(orgData.name);

      // Fetch members
      const membersResponse = await fetch('/api/organization/members');
      if (!membersResponse.ok) throw new Error('Failed to fetch members');
      const membersData = await membersResponse.json();
      setMembers(membersData.members || []);

      // Fetch invitations (if admin/owner)
      if (tenantData.role === 'owner' || tenantData.role === 'admin') {
        const invitationsResponse = await fetch('/api/organization/invitations');
        if (invitationsResponse.ok) {
          const invitationsData = await invitationsResponse.json();
          setInvitations(invitationsData.invitations || []);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch organization data:', err);
      setError(err.message || 'Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeClick = (invitation: Invitation) => {
    setInvitationToRevoke(invitation);
    setShowConfirmDialog(true);
  };

  const handleRevokeConfirm = async () => {
    if (!invitationToRevoke) return;

    try {
      setRevokingId(invitationToRevoke.id);
      const response = await fetch(`/api/organization/invitations/${invitationToRevoke.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to revoke invitation');
      }

      // Remove from list
      setInvitations(invitations.filter(inv => inv.id !== invitationToRevoke.id));

      // Show success message (you can replace with a toast)
      alert('✅ Invitation revoked successfully');
    } catch (err: any) {
      console.error('Failed to revoke invitation:', err);
      alert(`❌ ${err.message}`);
    } finally {
      setRevokingId(null);
      setShowConfirmDialog(false);
      setInvitationToRevoke(null);
    }
  };

  const handleRevokeCancel = () => {
    setShowConfirmDialog(false);
    setInvitationToRevoke(null);
  };

  const handleRoleChange = (member: Member, newRole: 'owner' | 'admin' | 'member') => {
    setRoleChangeData({ member, newRole });
    setShowRoleChangeDialog(true);
  };

  const handleRoleChangeConfirm = async () => {
    if (!roleChangeData) return;

    try {
      setChangingRoleId(roleChangeData.member.id);
      const response = await fetch(`/api/organization/members/${roleChangeData.member.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newRole: roleChangeData.newRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change role');
      }

      // Update member in list
      setMembers(members.map(m =>
        m.id === roleChangeData.member.id
          ? { ...m, role: roleChangeData.newRole }
          : m
      ));

      // Show success message
      alert(`✅ ${roleChangeData.member.name}'s role changed to ${roleChangeData.newRole}`);
    } catch (err: any) {
      console.error('Failed to change role:', err);
      alert(`❌ ${err.message}`);
    } finally {
      setChangingRoleId(null);
      setShowRoleChangeDialog(false);
      setRoleChangeData(null);
    }
  };

  const handleRoleChangeCancel = () => {
    setShowRoleChangeDialog(false);
    setRoleChangeData(null);
  };

  const canChangeRole = (member: Member) => {
    // Only owners and admins can change roles
    if (userRole !== 'owner' && userRole !== 'admin') return false;

    // Cannot change your own role
    if (currentUserId && member.id === currentUserId) return false;

    // Cannot change role of last owner
    if (member.role === 'owner') {
      const ownerCount = members.filter(m => m.role === 'owner').length;
      if (ownerCount <= 1) return false;
    }

    return true;
  };

  const getAvailableRoles = () => {
    // Only owners can promote to owner
    if (userRole === 'owner') {
      return ['owner', 'admin', 'member'] as const;
    }
    // Admins can only assign admin or member
    return ['admin', 'member'] as const;
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'member':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const hoursUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilExpiry < 24 && hoursUntilExpiry > 0;
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading organization...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Error Loading Organization
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchOrganizationData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const canManageInvitations = userRole === 'owner' || userRole === 'admin';

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header - Same as Dashboard */}
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
                  Organization: {organizationName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
              >
                ← Dashboard
              </button>

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
                      onClick={async () => {
                        await signOut();
                        router.push('/auth/signin');
                      }}
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Members Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
              <UserCheck className="h-5 w-5 mr-2" />
              Team Members ({members.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Joined
                  </th>
                  {(userRole === 'owner' || userRole === 'admin') && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {member.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {member.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(member.role)}`}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(member.joinedAt)}
                    </td>
                    {(userRole === 'owner' || userRole === 'admin') && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {canChangeRole(member) ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member, e.target.value as 'owner' | 'admin' | 'member')}
                            disabled={changingRoleId === member.id}
                            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {getAvailableRoles().map(role => (
                              <option key={role} value={role}>
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 text-xs">
                            {member.id === currentUserId ? 'You' : 'Protected'}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Invitations Table (only for owners/admins) */}
        {canManageInvitations && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Mail className="h-5 w-5 mr-2" />
                Pending Invitations ({invitations.length})
              </h2>
            </div>
            {invitations.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 mb-2">No pending invitations</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                  Invite team members to grow your organization
                </p>
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                >
                  Go to Dashboard
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Invited By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Expires
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {invitations.map((invitation) => (
                      <tr key={invitation.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {invitation.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(invitation.role)}`}>
                            {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {invitation.invitedBy}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center">
                            <span className={isExpiringSoon(invitation.expiresAt) ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}>
                              {formatDate(invitation.expiresAt)}
                            </span>
                            {isExpiringSoon(invitation.expiresAt) && (
                              <AlertCircle className="h-4 w-4 ml-1 text-orange-600 dark:text-orange-400" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleRevokeClick(invitation)}
                            disabled={revokingId === invitation.id}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                          >
                            <X className="h-4 w-4 mr-1" />
                            {revokingId === invitation.id ? 'Revoking...' : 'Revoke'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* GitHub Tokens Section (Owners/Admins only) */}
        {(userRole === 'owner' || userRole === 'admin') && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Key className="h-5 w-5 mr-2" />
                GitHub Tokens
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage GitHub Personal Access Tokens for your organization. These tokens can be reused across multiple builds.
              </p>
            </div>
            <div className="p-6">
              <TokenList />
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && invitationToRevoke && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Revoke Invitation?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to revoke the invitation for <strong>{invitationToRevoke.email}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRevokeCancel}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Change Confirmation Dialog */}
      {showRoleChangeDialog && roleChangeData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Change Member Role?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Are you sure you want to change <strong>{roleChangeData.member.name}</strong>'s role from{' '}
              <strong>{roleChangeData.member.role}</strong> to <strong>{roleChangeData.newRole}</strong>?
              This will take effect immediately.
            </p>
            {roleChangeData.member.role === 'owner' && roleChangeData.newRole !== 'owner' && (
              <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  ⚠️ <strong>Warning:</strong> This user will lose owner privileges including the ability to delete the organization.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleRoleChangeCancel}
                disabled={changingRoleId !== null}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChangeConfirm}
                disabled={changingRoleId !== null}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {changingRoleId ? 'Changing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

