import { NextRequest, NextResponse } from 'next/server';
import { RegisterTenantUseCase } from '@/use-cases/registerTenant';
import { DatabaseTenantRepository, DatabaseTenantMemberRepository } from '@/infrastructure/TenantRepository';

const tenantRepository = new DatabaseTenantRepository();
const tenantMemberRepository = new DatabaseTenantMemberRepository();
const registerTenantUseCase = new RegisterTenantUseCase(tenantRepository, tenantMemberRepository);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tenantName } = body;

    // Validate required fields
    if (!userId || !tenantName) {
      return NextResponse.json(
        { error: 'userId and tenantName are required' },
        { status: 400 }
      );
    }

    // Create tenant and associate user as owner
    const { tenant } = await registerTenantUseCase.execute({
      userId,
      tenantName,
    });

    return NextResponse.json({
      success: true,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    });

  } catch (error: any) {
    console.error('[Tenant API] Error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Handle unique constraint violations
    if (error.code === 'SQLITE_CONSTRAINT' || error.message?.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { error: 'A tenant with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create tenant. Please try again.' },
      { status: 500 }
    );
  }
}

