/**
 * Use Case: Accept Invitation
 *
 * Allows a user to accept an invitation and join a tenant.
 * Validates the token, checks expiration, and associates the user with the tenant.
 */

import type { Invitation, TenantMember } from '../domain/models';
import type { InvitationRepository } from './createInvitation';
import type { TenantMemberRepository } from './registerTenant';

export interface AcceptInvitationInput {
  token: string;
  userId: string;
}

export interface AcceptInvitationOutput {
  invitation: Invitation;
  tenantMember: TenantMember;
}

export class AcceptInvitationUseCase {
  constructor(
    private invitationRepository: InvitationRepository,
    private tenantMemberRepository: TenantMemberRepository
  ) {}

  async execute(input: AcceptInvitationInput): Promise<AcceptInvitationOutput> {
    // Find invitation by token
    const invitation = await this.invitationRepository.findByToken(input.token);

    if (!invitation) {
      throw new Error('Invalid invitation token');
    }

    // Check if already accepted
    if (invitation.acceptedAt) {
      throw new Error('This invitation has already been accepted');
    }

    // Check expiration
    if (new Date() > invitation.expiresAt) {
      throw new Error('This invitation has expired');
    }

    // Check if user is already a member
    const existingMembership = await this.tenantMemberRepository.findByUserIdAndTenantId(
      input.userId,
      invitation.tenantId
    );

    if (existingMembership) {
      throw new Error('You are already a member of this team');
    }

    // Create tenant membership
    const tenantMember = await this.tenantMemberRepository.create({
      tenantId: invitation.tenantId,
      userId: input.userId,
      role: invitation.role,
      invitedBy: invitation.invitedBy,
      joinedAt: new Date(),
    });

    // Mark invitation as accepted
    await this.invitationRepository.markAsAccepted(invitation.id);

    return {
      invitation,
      tenantMember,
    };
  }
}

