import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/infrastructure/auth-session';
import { db } from '@/infrastructure/database/client';
import { tenantMembers, users } from '@/infrastructure/database/schema';
import { eq } from 'drizzle-orm';

/**
 * GET /api/organization/members
 * Get all members of the current user's organization
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

    // Get user's tenant ID
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

    const tenantId = userMembership[0].tenantId;

    // Fetch all members of the tenant with user details
    const members = await db
      .select({
        id: tenantMembers.id,
        name: users.name,
        email: users.email,
        role: tenantMembers.role,
        joinedAt: tenantMembers.joinedAt,
      })
      .from(tenantMembers)
      .innerJoin(users, eq(tenantMembers.userId, users.id))
      .where(eq(tenantMembers.tenantId, tenantId))
      .orderBy(tenantMembers.joinedAt);

    return NextResponse.json({
      members: members.map((member: any) => ({
        id: member.id,
        name: member.name || member.email,
        email: member.email,
        role: member.role,
        joinedAt: member.joinedAt,
      })),
    });

  } catch (error: any) {
    console.error('[Get Organization Members API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization members' },
      { status: 500 }
    );
  }
}

