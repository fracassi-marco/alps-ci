import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/infrastructure/auth-session';
import { DatabaseTenantRepository } from '@/infrastructure/TenantRepository';

const tenantRepository = new DatabaseTenantRepository();

/**
 * GET /api/organization/[id]
 * Get organization details by ID
 */
export async function GET(
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

    // Fetch tenant
    const tenant = await tenantRepository.findById(id);

    if (!tenant) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      createdAt: tenant.createdAt,
    });

  } catch (error: any) {
    console.error('[Get Organization API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch organization details' },
      { status: 500 }
    );
  }
}

