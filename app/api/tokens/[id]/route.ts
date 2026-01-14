import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/infrastructure/auth-session';
import { DatabaseTenantMemberRepository } from '@/infrastructure/DatabaseTenantMemberRepository';
import { DatabaseAccessTokenRepository } from '@/infrastructure/DatabaseAccessTokenRepository';
import { UpdateAccessTokenUseCase } from '@/use-cases/updateAccessToken';

const tenantMemberRepository = new DatabaseTenantMemberRepository();
const tokenRepository = new DatabaseAccessTokenRepository();

export async function PATCH(
  request: Request,
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

    // Get user's tenant memberships
    const memberships = await tenantMemberRepository.findByUserId(currentUser.id);
    if (memberships.length === 0) {
      return NextResponse.json(
        { error: 'No tenant membership found' },
        { status: 404 }
      );
    }

    const membership = memberships[0]!;
    const tenantId = membership.tenantId;
    const userRole = membership.role;

    // Parse request body
    const body = await request.json();
    const { name, token } = body;

    // Validate at least one field is provided
    if (name === undefined && token === undefined) {
      return NextResponse.json(
        { error: 'At least one field (name or token) must be provided' },
        { status: 400 }
      );
    }

    // Update token using use case
    const useCase = new UpdateAccessTokenUseCase(tokenRepository);
    const updatedToken = await useCase.execute({
      tokenId: id,
      tenantId,
      userId: currentUser.id,
      userRole,
      name,
      token,
    });

    // Return response without encrypted token
    return NextResponse.json({
      id: updatedToken.id,
      tenantId: updatedToken.tenantId,
      name: updatedToken.name,
      createdBy: updatedToken.createdBy,
      lastUsed: updatedToken.lastUsed,
      createdAt: updatedToken.createdAt,
      updatedAt: updatedToken.updatedAt,
    });
  } catch (error) {
    console.error('Failed to update token:', error);

    if (error instanceof Error) {
      if (error.message.includes('Insufficient permissions')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.includes('Token not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (
        error.message.includes('cannot be empty') ||
        error.message.includes('already exists') ||
        error.message.includes('must be') ||
        error.message.includes('At least one field')
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: 'Failed to update Access Token' },
      { status: 500 }
    );
  }
}

