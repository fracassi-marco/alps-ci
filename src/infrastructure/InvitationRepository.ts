/**
 * Database Repository for Invitations
 * Implements invitation CRUD operations using Drizzle ORM
 */

import { eq, and, isNull } from 'drizzle-orm';
import { db } from './database/client';
import { invitations } from './database/schema';
import type { Invitation } from '../domain/models';
import type { InvitationRepository } from '../use-cases/createInvitation';

export class DatabaseInvitationRepository implements InvitationRepository {
  async create(data: Omit<Invitation, 'id' | 'createdAt'>): Promise<Invitation> {
    const [invitation] = await db
      .insert(invitations)
      .values({
        tenantId: data.tenantId,
        email: data.email,
        role: data.role,
        token: data.token,
        invitedBy: data.invitedBy,
        expiresAt: data.expiresAt,
        acceptedAt: data.acceptedAt,
      })
      .returning();

    if (!invitation) {
      throw new Error('Failed to create invitation');
    }

    return {
      id: invitation.id,
      tenantId: invitation.tenantId,
      email: invitation.email,
      role: invitation.role as 'owner' | 'admin' | 'member',
      token: invitation.token,
      invitedBy: invitation.invitedBy,
      expiresAt: new Date(invitation.expiresAt),
      acceptedAt: invitation.acceptedAt ? new Date(invitation.acceptedAt) : null,
      createdAt: new Date(invitation.createdAt),
    };
  }

  async findById(id: string): Promise<Invitation | null> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, id))
      .limit(1);

    if (!invitation) return null;

    return {
      id: invitation.id,
      tenantId: invitation.tenantId,
      email: invitation.email,
      role: invitation.role as 'owner' | 'admin' | 'member',
      token: invitation.token,
      invitedBy: invitation.invitedBy,
      expiresAt: new Date(invitation.expiresAt),
      acceptedAt: invitation.acceptedAt ? new Date(invitation.acceptedAt) : null,
      createdAt: new Date(invitation.createdAt),
    };
  }

  async findByToken(token: string): Promise<Invitation | null> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);

    if (!invitation) return null;

    return {
      id: invitation.id,
      tenantId: invitation.tenantId,
      email: invitation.email,
      role: invitation.role as 'owner' | 'admin' | 'member',
      token: invitation.token,
      invitedBy: invitation.invitedBy,
      expiresAt: new Date(invitation.expiresAt),
      acceptedAt: invitation.acceptedAt ? new Date(invitation.acceptedAt) : null,
      createdAt: new Date(invitation.createdAt),
    };
  }

  async findByEmail(email: string): Promise<Invitation[]> {
    const results = await db
      .select()
      .from(invitations)
      .where(eq(invitations.email, email));

    return results.map((invitation: any) => ({
      id: invitation.id,
      tenantId: invitation.tenantId,
      email: invitation.email,
      role: invitation.role as 'owner' | 'admin' | 'member',
      token: invitation.token,
      invitedBy: invitation.invitedBy,
      expiresAt: new Date(invitation.expiresAt),
      acceptedAt: invitation.acceptedAt ? new Date(invitation.acceptedAt) : null,
      createdAt: new Date(invitation.createdAt),
    }));
  }

  async findPendingByTenantId(tenantId: string): Promise<Invitation[]> {
    const results = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.tenantId, tenantId),
          isNull(invitations.acceptedAt)
        )
      );

    return results.map((invitation: any) => ({
      id: invitation.id,
      tenantId: invitation.tenantId,
      email: invitation.email,
      role: invitation.role as 'owner' | 'admin' | 'member',
      token: invitation.token,
      invitedBy: invitation.invitedBy,
      expiresAt: new Date(invitation.expiresAt),
      acceptedAt: null,
      createdAt: new Date(invitation.createdAt),
    }));
  }

  async markAsAccepted(id: string): Promise<void> {
    await db
      .update(invitations)
      .set({
        acceptedAt: new Date(),
      })
      .where(eq(invitations.id, id));
  }

  async delete(id: string): Promise<void> {
    await db
      .delete(invitations)
      .where(eq(invitations.id, id));
  }
}

