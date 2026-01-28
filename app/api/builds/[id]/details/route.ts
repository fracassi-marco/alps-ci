import { NextResponse } from 'next/server';
import { DatabaseBuildRepository } from '@/infrastructure/DatabaseBuildRepository';
import { FetchBuildDetailsStatsUseCase } from '@/use-cases/fetchBuildDetailsStats';
import { DatabaseWorkflowRunRepository } from '@/infrastructure/DatabaseWorkflowRunRepository';
import { DatabaseTestResultRepository } from '@/infrastructure/DatabaseTestResultRepository';
import { getCurrentUser } from '@/infrastructure/auth-session';
import { DatabaseTenantMemberRepository } from '@/infrastructure/DatabaseTenantMemberRepository';

const repository = new DatabaseBuildRepository();
const tenantMemberRepository = new DatabaseTenantMemberRepository();
const workflowRunRepository = new DatabaseWorkflowRunRepository();
const testResultRepository = new DatabaseTestResultRepository();

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

    // Fetch extended statistics with monthly data
    const useCase = new FetchBuildDetailsStatsUseCase(
      workflowRunRepository,
      testResultRepository
    );
    const detailsStats = await useCase.execute(build);

    return NextResponse.json(detailsStats);
  } catch (error) {
    console.error('Failed to fetch build details stats:', error);

    return NextResponse.json(
      { error: 'Failed to fetch build details statistics' },
      { status: 500 }
    );
  }
}
