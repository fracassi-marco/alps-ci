import type { InvitationRepository } from './createInvitation';
import { canInviteMembers } from '../domain/permissions';

export class RevokeInvitationUseCase {
  constructor(
    private invitationRepository: InvitationRepository
  ) {}

  async execute(params: {
    invitationId: string;
    tenantId: string;
    userRole: 'owner' | 'admin' | 'member';
  }): Promise<void> {
    const { invitationId, tenantId, userRole } = params;

    // Validate inputs
    if (!invitationId) {
      throw new Error('Invitation ID is required');
    }

    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    if (!userRole) {
      throw new Error('User role is required');
    }

    // Check permissions - only owners and admins can revoke invitations
    if (!canInviteMembers(userRole)) {
      throw new Error('Only owners and admins can revoke invitations');
    }

    // Verify invitation exists and belongs to the tenant
    const invitation = await this.invitationRepository.findById(invitationId);

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    if (invitation.tenantId !== tenantId) {
      throw new Error('Cannot revoke invitation from another organization');
    }

    // Check if invitation is already accepted
    if (invitation.acceptedAt) {
      throw new Error('Cannot revoke an invitation that has already been accepted');
    }

    // Delete the invitation
    await this.invitationRepository.delete(invitationId);
  }
}

