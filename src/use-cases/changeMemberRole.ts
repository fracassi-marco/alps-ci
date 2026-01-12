import type { TenantMemberRepository } from './registerTenant';
import { canInviteMembers } from '../domain/permissions';

export interface ChangeMemberRoleInput {
  userId: string;
  targetMemberId: string;
  newRole: 'owner' | 'admin' | 'member';
  tenantId: string;
}

export class ChangeMemberRoleUseCase {
  constructor(
    private tenantMemberRepository: TenantMemberRepository
  ) {}

  async execute(input: ChangeMemberRoleInput): Promise<void> {
    const { userId, targetMemberId, newRole, tenantId } = input;

    // Validate inputs
    if (!userId) {
      throw new Error('User ID is required');
    }

    if (!targetMemberId) {
      throw new Error('Target member ID is required');
    }

    if (!newRole) {
      throw new Error('New role is required');
    }

    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    // Validate new role
    if (!['owner', 'admin', 'member'].includes(newRole)) {
      throw new Error('Invalid role. Must be one of: owner, admin, member');
    }

    // Get current user's membership to check permissions
    const currentUserMembership = await this.tenantMemberRepository.findByUserIdAndTenantId(userId, tenantId);

    if (!currentUserMembership) {
      throw new Error('You are not a member of this organization');
    }

    // Check if user has permission to change roles (owner or admin)
    if (!canInviteMembers(currentUserMembership.role)) {
      throw new Error('Only owners and admins can change member roles');
    }

    // Get target member's current membership
    const targetMember = await this.tenantMemberRepository.findById(targetMemberId);

    if (!targetMember) {
      throw new Error('Member not found');
    }

    // Verify target member belongs to the same tenant
    if (targetMember.tenantId !== tenantId) {
      throw new Error('Cannot change role of member from another organization');
    }

    // Cannot change your own role
    if (currentUserMembership.id === targetMemberId) {
      throw new Error('You cannot change your own role');
    }

    // Only owners can promote members to owner
    if (newRole === 'owner' && currentUserMembership.role !== 'owner') {
      throw new Error('Only owners can promote members to owner');
    }

    // Cannot demote the last owner
    if (targetMember.role === 'owner' && newRole !== 'owner') {
      const allMembers = await this.tenantMemberRepository.findByTenantId(tenantId);
      const ownerCount = allMembers.filter((m: any) => m.role === 'owner').length;

      if (ownerCount <= 1) {
        throw new Error('Cannot demote the last owner. Promote another member to owner first.');
      }
    }

    // Update the member's role
    await this.tenantMemberRepository.updateMemberRole(targetMemberId, newRole);
  }
}

