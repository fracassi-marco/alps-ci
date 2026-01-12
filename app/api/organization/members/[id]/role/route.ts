import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/infrastructure/auth-session';
import { db } from '@/infrastructure/database/client';
import { tenantMembers } from '@/infrastructure/database/schema';
import { eq } from 'drizzle-orm';
import { ChangeMemberRoleUseCase } from '@/use-cases/changeMemberRole';
import { DatabaseTenantMemberRepository } from '@/infrastructure/TenantRepository';

/**
 * PATCH /api/organization/members/[id]/role
 * Update member role
 * Requires: owner or admin role
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: memberId } = await params;
    const body = await request.json();
    const { newRole } = body;

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

    // Use the ChangeMemberRoleUseCase
    const tenantMemberRepository = new DatabaseTenantMemberRepository();
    const changeMemberRoleUseCase = new ChangeMemberRoleUseCase(tenantMemberRepository);

    await changeMemberRoleUseCase.execute({
      userId: currentUser.id,
      targetMemberId: memberId,
      newRole,
      tenantId: membership.tenantId,
    });

    // Fetch updated member data
    const updatedMember = await tenantMemberRepository.findById(memberId);

    return NextResponse.json({
      success: true,
      message: 'Member role updated successfully',
      member: updatedMember,
    });

  } catch (error: any) {
    console.error('[Change Member Role API] Error:', error);

    // Handle specific error messages from use-case
    const errorMessage = error.message || 'Failed to update member role';

    // Determine appropriate status code
    let statusCode = 500;
    if (errorMessage.includes('required') ||
        errorMessage.includes('Invalid role') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('Cannot demote') ||
        errorMessage.includes('cannot change your own') ||
        errorMessage.includes('Only owners')) {
      statusCode = 400;
    } else if (errorMessage.includes('Only owners and admins')) {
      statusCode = 403;
    } else if (errorMessage.includes('Member not found')) {
      statusCode = 404;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

