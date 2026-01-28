import { NextResponse } from 'next/server';
import { DatabaseBuildRepository } from '@/infrastructure/DatabaseBuildRepository';
import { DatabaseAccessTokenRepository } from '@/infrastructure/DatabaseAccessTokenRepository';
import { EditBuildUseCase } from '@/use-cases/editBuild';
import { DeleteBuildUseCase } from '@/use-cases/deleteBuild';
import { ValidationError } from '@/domain/validation';
import { getCurrentUser } from '@/infrastructure/auth-session';
import { DatabaseTenantMemberRepository } from '@/infrastructure/DatabaseTenantMemberRepository';

const repository = new DatabaseBuildRepository();
const tenantMemberRepository = new DatabaseTenantMemberRepository();
const accessTokenRepository = new DatabaseAccessTokenRepository();

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const tenantId = memberships[0]!.tenantId;
    const { id } = await params;

    // Find the build (scoped to tenant)
    const build = await repository.findById(id, tenantId);

    if (!build) {
      return NextResponse.json({ error: 'Build not found' }, { status: 404 });
    }

    return NextResponse.json(build);
  } catch (error) {
    console.error('Failed to fetch build:', error);

    return NextResponse.json(
      { error: 'Failed to fetch build' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const membership = memberships[0];
    if (!membership) {
      return NextResponse.json(
        { error: 'No tenant membership found' },
        { status: 404 }
      );
    }

    const { id } = await params;
    const updates = await request.json();
    const useCase = new EditBuildUseCase(repository, accessTokenRepository);
    const updatedBuild = await useCase.execute(id, updates, membership.tenantId);

    return NextResponse.json(updatedBuild);
  } catch (error) {
    console.error('Failed to update build:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ error: 'Failed to update build' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const membership = memberships[0];
    if (!membership) {
      return NextResponse.json(
        { error: 'No tenant membership found' },
        { status: 404 }
      );
    }

    const { id } = await params;
    const useCase = new DeleteBuildUseCase(repository);
    await useCase.execute(id, membership.tenantId);

    return NextResponse.json({ message: 'Build deleted successfully' });
  } catch (error) {
    console.error('Failed to delete build:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: 'Failed to delete build' }, { status: 500 });
  }
}

