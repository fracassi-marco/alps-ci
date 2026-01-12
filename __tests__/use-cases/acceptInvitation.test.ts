/**
 * Unit Tests for Accept Invitation Use Case
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { AcceptInvitationUseCase } from '../../src/use-cases/acceptInvitation';
import type { Invitation, TenantMember } from '../../src/domain/models';
import type { InvitationRepository } from '../../src/use-cases/createInvitation';
import type { TenantMemberRepository } from '../../src/use-cases/registerTenant';

// Mock Repositories
class MockInvitationRepository implements InvitationRepository {
  private invitations: Invitation[] = [];

  async create(data: Omit<Invitation, 'id' | 'createdAt'>): Promise<Invitation> {
    const invitation: Invitation = {
      id: `inv-${Date.now()}`,
      ...data,
      createdAt: new Date(),
    };
    this.invitations.push(invitation);
    return invitation;
  }

  async findById(id: string): Promise<Invitation | null> {
    return this.invitations.find(i => i.id === id) || null;
  }

  async findByToken(token: string): Promise<Invitation | null> {
    return this.invitations.find(i => i.token === token) || null;
  }

  async findByEmail(email: string): Promise<Invitation[]> {
    return this.invitations.filter(i => i.email === email);
  }

  async findPendingByTenantId(tenantId: string): Promise<Invitation[]> {
    return this.invitations.filter(i => i.tenantId === tenantId && !i.acceptedAt);
  }

  async markAsAccepted(id: string): Promise<void> {
    const invitation = this.invitations.find(i => i.id === id);
    if (invitation) {
      invitation.acceptedAt = new Date();
    }
  }

  async delete(id: string): Promise<void> {
    this.invitations = this.invitations.filter(i => i.id !== id);
  }

  reset() {
    this.invitations = [];
  }
}

class MockTenantMemberRepository implements TenantMemberRepository {
  private members: TenantMember[] = [];
  private nextId = 1;

  async create(data: Omit<TenantMember, 'id' | 'createdAt'>): Promise<TenantMember> {
    const member: TenantMember = {
      id: `member-${this.nextId++}`,
      ...data,
      createdAt: new Date(),
    };
    this.members.push(member);
    return member;
  }

  async findByUserIdAndTenantId(userId: string, tenantId: string): Promise<TenantMember | null> {
    return this.members.find(m => m.userId === userId && m.tenantId === tenantId) || null;
  }

  reset() {
    this.members = [];
    this.nextId = 1;
  }
}

describe('AcceptInvitationUseCase', () => {
  let useCase: AcceptInvitationUseCase;
  let invitationRepository: MockInvitationRepository;
  let tenantMemberRepository: MockTenantMemberRepository;

  beforeEach(() => {
    invitationRepository = new MockInvitationRepository();
    tenantMemberRepository = new MockTenantMemberRepository();
    useCase = new AcceptInvitationUseCase(invitationRepository, tenantMemberRepository);
  });

  describe('Successful Acceptance', () => {
    test('should accept valid invitation and create membership', async () => {
      // Create invitation
      const invitation = await invitationRepository.create({
        tenantId: 'tenant-123',
        email: 'newuser@company.com',
        role: 'member',
        token: 'valid-token-123',
        invitedBy: 'user-456',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        acceptedAt: null,
      });

      const result = await useCase.execute({
        token: 'valid-token-123',
        userId: 'user-789',
      });

      expect(result.invitation.id).toBe(invitation.id);
      expect(result.tenantMember).toBeDefined();
      expect(result.tenantMember.userId).toBe('user-789');
      expect(result.tenantMember.tenantId).toBe('tenant-123');
      expect(result.tenantMember.role).toBe('member');
      expect(result.tenantMember.invitedBy).toBe('user-456');
    });

    test('should mark invitation as accepted', async () => {
      await invitationRepository.create({
        tenantId: 'tenant-123',
        email: 'user@test.com',
        role: 'admin',
        token: 'token-abc',
        invitedBy: 'user-1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: null,
      });

      await useCase.execute({
        token: 'token-abc',
        userId: 'user-new',
      });

      const invitation = await invitationRepository.findByToken('token-abc');
      expect(invitation?.acceptedAt).toBeDefined();
      expect(invitation?.acceptedAt).toBeInstanceOf(Date);
    });

    test('should accept invitation with admin role', async () => {
      await invitationRepository.create({
        tenantId: 'tenant-123',
        email: 'admin@company.com',
        role: 'admin',
        token: 'admin-token',
        invitedBy: 'owner-1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: null,
      });

      const result = await useCase.execute({
        token: 'admin-token',
        userId: 'user-admin',
      });

      expect(result.tenantMember.role).toBe('admin');
    });
  });

  describe('Validation Errors', () => {
    test('should throw error for invalid token', async () => {
      await expect(
        useCase.execute({
          token: 'non-existent-token',
          userId: 'user-123',
        })
      ).rejects.toThrow('Invalid invitation token');
    });

    test('should throw error for already accepted invitation', async () => {
      await invitationRepository.create({
        tenantId: 'tenant-123',
        email: 'user@test.com',
        role: 'member',
        token: 'accepted-token',
        invitedBy: 'user-1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: new Date(), // Already accepted
      });

      await expect(
        useCase.execute({
          token: 'accepted-token',
          userId: 'user-123',
        })
      ).rejects.toThrow('This invitation has already been accepted');
    });

    test('should throw error for expired invitation', async () => {
      await invitationRepository.create({
        tenantId: 'tenant-123',
        email: 'user@test.com',
        role: 'member',
        token: 'expired-token',
        invitedBy: 'user-1',
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        acceptedAt: null,
      });

      await expect(
        useCase.execute({
          token: 'expired-token',
          userId: 'user-123',
        })
      ).rejects.toThrow('This invitation has expired');
    });

    test('should throw error if user is already a member', async () => {
      // Create existing membership
      await tenantMemberRepository.create({
        tenantId: 'tenant-123',
        userId: 'user-existing',
        role: 'member',
        invitedBy: null,
        joinedAt: new Date(),
      });

      // Create invitation
      await invitationRepository.create({
        tenantId: 'tenant-123',
        email: 'existing@test.com',
        role: 'admin',
        token: 'duplicate-token',
        invitedBy: 'user-1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: null,
      });

      await expect(
        useCase.execute({
          token: 'duplicate-token',
          userId: 'user-existing',
        })
      ).rejects.toThrow('You are already a member of this team');
    });
  });

  describe('Edge Cases', () => {
    test('should accept invitation at exact expiration time', async () => {
      const expirationTime = new Date(Date.now() + 1000); // 1 second from now

      await invitationRepository.create({
        tenantId: 'tenant-123',
        email: 'user@test.com',
        role: 'member',
        token: 'edge-token',
        invitedBy: 'user-1',
        expiresAt: expirationTime,
        acceptedAt: null,
      });

      // Should succeed if accepted before expiration
      const result = await useCase.execute({
        token: 'edge-token',
        userId: 'user-new',
      });

      expect(result.tenantMember).toBeDefined();
    });

    test('should set joinedAt timestamp correctly', async () => {
      await invitationRepository.create({
        tenantId: 'tenant-123',
        email: 'user@test.com',
        role: 'member',
        token: 'time-token',
        invitedBy: 'user-1',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: null,
      });

      const before = new Date();
      const result = await useCase.execute({
        token: 'time-token',
        userId: 'user-new',
      });
      const after = new Date();

      expect(result.tenantMember.joinedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.tenantMember.joinedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});

