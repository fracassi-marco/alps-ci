import { NextResponse } from 'next/server';
import { DatabaseBuildRepository } from '@/infrastructure/DatabaseBuildRepository';
import { DatabaseAccessTokenRepository } from '@/infrastructure/DatabaseAccessTokenRepository';
import { AddBuildUseCase } from '@/use-cases/addBuild';
import { ListBuildsUseCase } from '@/use-cases/listBuilds';
import { ValidationError } from '@/domain/validation';
import { getCurrentUser } from '@/infrastructure/auth-session';
import { DatabaseTenantMemberRepository } from '@/infrastructure/DatabaseTenantMemberRepository';

const repository = new DatabaseBuildRepository();
const tenantMemberRepository = new DatabaseTenantMemberRepository();
const accessTokenRepository = new DatabaseAccessTokenRepository();

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

    // Use first membership (primary tenant)
    const membership = memberships[0];
    if (!membership) {
      return NextResponse.json(
        { error: 'No tenant membership found' },
        { status: 404 }
      );
    }

    const useCase = new ListBuildsUseCase(repository);
    const builds = await useCase.execute(membership.tenantId);
    return NextResponse.json(builds);
  } catch (error) {
    console.error('Failed to fetch builds:', error);
    return NextResponse.json({ error: 'Failed to fetch builds' }, { status: 500 });
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

    // Use first membership (primary tenant)
    const membership = memberships[0];
    if (!membership) {
      return NextResponse.json(
        { error: 'No tenant membership found' },
        { status: 404 }
      );
    }

    const newBuild = await request.json();
    const useCase = new AddBuildUseCase(repository, accessTokenRepository);
    const savedBuild = await useCase.execute(newBuild, membership.tenantId);

    return NextResponse.json(savedBuild, { status: 201 });
  } catch (error) {
    console.error('Failed to add build:', error);

    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ error: 'Failed to add build' }, { status: 500 });
  }
}

