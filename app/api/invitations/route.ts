import { NextRequest, NextResponse } from 'next/server';
import { CreateInvitationUseCase } from '@/use-cases/createInvitation';
import { DatabaseInvitationRepository } from '@/infrastructure/InvitationRepository';
import { canInviteMembers, requirePermission } from '@/domain/permissions';
import { getCurrentUser } from '@/infrastructure/auth-session';
import {DatabaseTenantMemberRepository} from "@/infrastructure/DatabaseTenantMemberRepository.ts";

const invitationRepository = new DatabaseInvitationRepository();
const tenantMemberRepository = new DatabaseTenantMemberRepository();
const createInvitationUseCase = new CreateInvitationUseCase(invitationRepository);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, email, role } = body;

    // Get current user from session
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const userId = currentUser.id;

    // Validate required fields
    if (!tenantId || !email || !role) {
      return NextResponse.json(
        { error: 'Tenant ID, email, and role are required' },
        { status: 400 }
      );
    }

    // Check if user is a member of the tenant
    const membership = await tenantMemberRepository.findByUserIdAndTenantId(userId, tenantId);
    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this team' },
        { status: 403 }
      );
    }

    // Check if user has permission to invite members
    requirePermission(
      canInviteMembers(membership.role),
      'Only owners and admins can invite new members'
    );

    // Create invitation
    const { invitation } = await createInvitationUseCase.execute({
      tenantId,
      email,
      role,
      invitedBy: userId,
    });

    // Generate invitation link
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${invitation.token}`;

    // TODO: Send invitation email
    console.log(`📧 Invitation email would be sent to ${email}`);
    console.log(`   Link: ${invitationLink}`);
    console.log(`   Role: ${role}`);
    console.log(`   Expires: ${invitation.expiresAt}`);

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        link: invitationLink,
      },
      message: `Invitation sent to ${email}`,
    });

  } catch (error: any) {
    console.error('[Create Invitation API] Error:', error);

    // Handle permission errors
    if (error.name === 'PermissionError') {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      );
    }

    // Handle validation errors
    if (error.name === 'ValidationError' || error.message.includes('Invalid')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}

// GET pending invitations for a tenant
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Get current user from session
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in.' },
        { status: 401 }
      );
    }

    const userId = currentUser.id;

    // Check if user is a member of the tenant
    const membership = await tenantMemberRepository.findByUserIdAndTenantId(userId, tenantId);
    if (!membership) {
      return NextResponse.json(
        { error: 'You are not a member of this team' },
        { status: 403 }
      );
    }

    // Get pending invitations
    const invitations = await invitationRepository.findPendingByTenantId(tenantId);

    return NextResponse.json({
      invitations: invitations.map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
      })),
    });

  } catch (error: any) {
    console.error('[Get Invitations API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

