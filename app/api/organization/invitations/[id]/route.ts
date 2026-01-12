import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/infrastructure/auth-session';
import { db } from '@/infrastructure/database/client';
import { tenantMembers } from '@/infrastructure/database/schema';
import { eq } from 'drizzle-orm';
import { RevokeInvitationUseCase } from '@/use-cases/revokeInvitation';
import { DatabaseInvitationRepository } from '@/infrastructure/InvitationRepository';

/**
 * DELETE /api/organization/invitations/[id]
 * Revoke/delete a pending invitation
 * Requires: owner or admin role
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get current user from session
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    // Get user's tenant membership
    const userMembership = await db
      .select()
      .from(tenantMembers)
      .where(eq(tenantMembers.userId, currentUser.id))
      .limit(1);

    if (!userMembership || userMembership.length === 0) {
      return NextResponse.json(
        { error: 'No organization membership found' },
        { status: 404 }
      );
    }

    const membership = userMembership[0];

    // Use the RevokeInvitationUseCase
    const invitationRepository = new DatabaseInvitationRepository();
    const revokeInvitationUseCase = new RevokeInvitationUseCase(invitationRepository);

    await revokeInvitationUseCase.execute({
      invitationId: id,
      tenantId: membership.tenantId,
      userRole: membership.role,
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation revoked successfully',
    });

  } catch (error: any) {
    console.error('[Revoke Invitation API] Error:', error);

    // Handle specific error messages from use-case
    if (error.message.includes('required') ||
        error.message.includes('not found') ||
        error.message.includes('Cannot revoke') ||
        error.message.includes('Only owners')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Only owners') ? 403 : 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to revoke invitation' },
      { status: 500 }
    );
  }
}



