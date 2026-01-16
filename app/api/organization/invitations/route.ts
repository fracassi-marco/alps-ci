import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/infrastructure/auth-session';
import { canInviteMembers } from '@/domain/permissions';
import { db } from '@/infrastructure/database/client';
import { tenantMembers, invitations, users } from '@/infrastructure/database/schema';
import { eq, and, isNull, gt } from 'drizzle-orm';

/**
 * GET /api/organization/invitations
 * Get pending invitations for the current user's organization
 * Requires: owner or admin role
 */
export async function GET(_request: NextRequest) {
  try {
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

    if (!userMembership || !userMembership[0]) {
      return NextResponse.json(
        { error: 'No organization membership found' },
        { status: 404 }
      );
    }

    const membership = userMembership[0];

    // Check if user has permission to view invitations
    if (!canInviteMembers(membership.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can view invitations' },
        { status: 403 }
      );
    }

    // Fetch pending invitations with inviter details
    const now = new Date();
    const pendingInvitations = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        expiresAt: invitations.expiresAt,
        createdAt: invitations.createdAt,
        invitedByName: users.name,
        invitedByEmail: users.email,
      })
      .from(invitations)
      .innerJoin(users, eq(invitations.invitedBy, users.id))
      .where(
        and(
          eq(invitations.tenantId, membership.tenantId),
          isNull(invitations.acceptedAt),
          gt(invitations.expiresAt, now)
        )
      )
      .orderBy(invitations.createdAt);

    return NextResponse.json({
      invitations: pendingInvitations.map((inv: any) => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expiresAt: inv.expiresAt,
        invitedBy: inv.invitedByName || inv.invitedByEmail,
      })),
    });

  } catch (error: any) {
    console.error('[Get Organization Invitations API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

