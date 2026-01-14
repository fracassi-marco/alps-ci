import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/infrastructure/auth-session';
import { DatabaseTenantMemberRepository } from '@/infrastructure/DatabaseTenantMemberRepository';
import { DatabaseAccessTokenRepository } from '@/infrastructure/DatabaseAccessTokenRepository';
import { ListAccessTokensUseCase } from '@/use-cases/listAccessTokens';
import { CreateAccessTokenUseCase } from '@/use-cases/createAccessToken';

const tenantMemberRepository = new DatabaseTenantMemberRepository();
const tokenRepository = new DatabaseAccessTokenRepository();

export async function GET() {
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
        { error: 'No tenant membership found' },
        { status: 404 }
      );
    }

    const membership = memberships[0]!;
    const tenantId = membership.tenantId;
    const userRole = membership.role;

    // List tokens using use case
    const useCase = new ListAccessTokensUseCase(tokenRepository);
    const tokens = await useCase.execute({ tenantId, userRole });

    return NextResponse.json(tokens);
  } catch (error) {
    console.error('Failed to list tokens:', error);

    if (error instanceof Error && error.message.includes('Insufficient permissions')) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to list Access Tokens' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    if (!name || !token) {
      return NextResponse.json(
        { error: 'Name and token are required' },
        { status: 400 }
      );
    }

    // Create token using use case
    const useCase = new CreateAccessTokenUseCase(tokenRepository);
    const newToken = await useCase.execute({
      tenantId,
      userId: currentUser.id,
      userRole,
      name,
      token,
    });

    // Return response without encrypted token
    return NextResponse.json(
      {
        id: newToken.id,
        tenantId: newToken.tenantId,
        name: newToken.name,
        createdBy: newToken.createdBy,
        lastUsed: newToken.lastUsed,
        createdAt: newToken.createdAt,
        updatedAt: newToken.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create token:', error);

    if (error instanceof Error) {
      if (error.message.includes('Insufficient permissions')) {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (
        error.message.includes('required') ||
        error.message.includes('already exists') ||
        error.message.includes('must be')
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json(
      { error: 'Failed to create Access Token' },
      { status: 500 }
    );
  }
}

