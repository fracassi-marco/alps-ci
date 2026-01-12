import { NextRequest, NextResponse } from 'next/server';
import { AcceptInvitationUseCase } from '@/use-cases/acceptInvitation';
import { DatabaseInvitationRepository } from '@/infrastructure/InvitationRepository';
import { getCurrentUser } from '@/infrastructure/auth-session';
import {DatabaseTenantMemberRepository} from "@/infrastructure/DatabaseTenantMemberRepository.ts";

const invitationRepository = new DatabaseInvitationRepository();
const tenantMemberRepository = new DatabaseTenantMemberRepository();
const acceptInvitationUseCase = new AcceptInvitationUseCase(
  invitationRepository,
  tenantMemberRepository
);

// GET invitation details by token
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await invitationRepository.findByToken(token);

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    // Check if expired
    const isExpired = new Date() > invitation.expiresAt;

    // Check if already accepted
    const isAccepted = !!invitation.acceptedAt;

    return NextResponse.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        isExpired,
        isAccepted,
      },
    });

  } catch (error: any) {
    console.error('[Get Invitation API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    );
  }
}

// POST accept invitation
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Get current user from session
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to accept the invitation.' },
        { status: 401 }
      );
    }

    const userId = currentUser.id;

    // Accept invitation
    const { tenantMember } = await acceptInvitationUseCase.execute({
      token,
      userId,
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully joined the team!',
      tenant: {
        id: tenantMember.tenantId,
        role: tenantMember.role,
      },
    });

  } catch (error: any) {
    console.error('[Accept Invitation API] Error:', error);

    // Handle specific errors
    if (
      error.message.includes('Invalid invitation') ||
      error.message.includes('expired') ||
      error.message.includes('already been accepted') ||
      error.message.includes('already a member')
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}

