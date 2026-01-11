/**
 * Permission checking utilities for role-based access control
 */

import type { Role } from './models';

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Check if a role can invite members
 * Only owners and admins can invite new members
 */
export function canInviteMembers(role: Role): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Check if a role can manage builds
 * Owners and admins can manage builds, members can only view
 */
export function canManageBuilds(role: Role): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Check if a role can remove members
 * Only owners can remove members
 */
export function canRemoveMembers(role: Role): boolean {
  return role === 'owner';
}

/**
 * Check if a role can delete tenant
 * Only owners can delete the tenant
 */
export function canDeleteTenant(role: Role): boolean {
  return role === 'owner';
}

/**
 * Check if a role can update member roles
 * Only owners can update member roles
 */
export function canUpdateMemberRoles(role: Role): boolean {
  return role === 'owner';
}

/**
 * Require permission or throw error
 */
export function requirePermission(hasPermission: boolean, message: string): void {
  if (!hasPermission) {
    throw new PermissionError(message);
  }
}

