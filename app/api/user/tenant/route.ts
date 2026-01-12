import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/infrastructure/auth-session';
import { DatabaseTenantMemberRepository } from '@/infrastructure/TenantRepository';

const tenantMemberRepository = new DatabaseTenantMemberRepository();

/**
 * GET /api/user/tenant
 * Get the current user's tenant membership information
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

    // Get user's tenant memberships
    const memberships = await tenantMemberRepository.findByUserId(currentUser.id);

    if (memberships.length === 0) {
      return NextResponse.json(
        { error: 'No tenant membership found. Please contact support.' },
        { status: 404 }
      );
    }

    // For now, return the first membership (primary tenant)
    // In the future, we can support multiple tenants per user
    const primaryMembership = memberships[0];

    if (!primaryMembership) {
      return NextResponse.json(
        { error: 'No tenant membership found. Please contact support.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      tenantId: primaryMembership.tenantId,
      role: primaryMembership.role,
      joinedAt: primaryMembership.joinedAt,
    });

  } catch (error: any) {
    console.error('[Get User Tenant API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tenant information' },
      { status: 500 }
    );
  }
}

