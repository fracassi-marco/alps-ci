/**
 * Unit Tests for Create Invitation Use Case
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { CreateInvitationUseCase } from '../../src/use-cases/createInvitation';
import type { Invitation } from '../../src/domain/models';
import type { InvitationRepository } from '../../src/use-cases/createInvitation';

// Mock Repository
class MockInvitationRepository implements InvitationRepository {
  private invitations: Invitation[] = [];
  private nextId = 1;

  async create(data: Omit<Invitation, 'id' | 'createdAt'>): Promise<Invitation> {
    const invitation: Invitation = {
      id: `invitation-${this.nextId++}`,
      ...data,
      createdAt: new Date(),
    };
    this.invitations.push(invitation);
    return invitation;
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

  reset() {
    this.invitations = [];
    this.nextId = 1;
  }
}

describe('CreateInvitationUseCase', () => {
  let useCase: CreateInvitationUseCase;
  let repository: MockInvitationRepository;

  beforeEach(() => {
    repository = new MockInvitationRepository();
    useCase = new CreateInvitationUseCase(repository);
  });

  describe('Successful Invitation Creation', () => {
    test('should create invitation with valid data', async () => {
      const input = {
        tenantId: 'tenant-123',
        email: 'colleague@company.com',
        role: 'member' as const,
        invitedBy: 'user-456',
      };

      const result = await useCase.execute(input);

      expect(result.invitation).toBeDefined();
      expect(result.invitation.email).toBe(input.email);
      expect(result.invitation.role).toBe(input.role);
      expect(result.invitation.tenantId).toBe(input.tenantId);
      expect(result.invitation.invitedBy).toBe(input.invitedBy);
      expect(result.invitation.token).toBeDefined();
      expect(result.invitation.token.length).toBe(64); // 32 bytes = 64 hex
      expect(result.invitation.acceptedAt).toBeNull();
    });

    test('should set expiration to 7 days from now', async () => {
      const before = new Date();
      before.setDate(before.getDate() + 7);

      const result = await useCase.execute({
        tenantId: 'tenant-123',
        email: 'test@example.com',
        role: 'admin',
        invitedBy: 'user-1',
      });

      const after = new Date();
      after.setDate(after.getDate() + 7);

      expect(result.invitation.expiresAt.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(result.invitation.expiresAt.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    test('should generate unique tokens for different invitations', async () => {
      const result1 = await useCase.execute({
        tenantId: 'tenant-1',
        email: 'user1@test.com',
        role: 'member',
        invitedBy: 'admin-1',
      });

      const result2 = await useCase.execute({
        tenantId: 'tenant-1',
        email: 'user2@test.com',
        role: 'member',
        invitedBy: 'admin-1',
      });

      expect(result1.invitation.token).not.toBe(result2.invitation.token);
    });

    test('should create invitation with owner role', async () => {
      const result = await useCase.execute({
        tenantId: 'tenant-123',
        email: 'owner@company.com',
        role: 'owner',
        invitedBy: 'user-1',
      });

      expect(result.invitation.role).toBe('owner');
    });

    test('should create invitation with admin role', async () => {
      const result = await useCase.execute({
        tenantId: 'tenant-123',
        email: 'admin@company.com',
        role: 'admin',
        invitedBy: 'user-1',
      });

      expect(result.invitation.role).toBe('admin');
    });
  });

  describe('Validation', () => {
    test('should throw error for invalid email', async () => {
      await expect(
        useCase.execute({
          tenantId: 'tenant-123',
          email: 'invalid-email',
          role: 'member',
          invitedBy: 'user-1',
        })
      ).rejects.toThrow('Invalid email format');
    });

    test('should throw error for empty email', async () => {
      await expect(
        useCase.execute({
          tenantId: 'tenant-123',
          email: '',
          role: 'member',
          invitedBy: 'user-1',
        })
      ).rejects.toThrow();
    });

    test('should throw error for invalid role', async () => {
      await expect(
        useCase.execute({
          tenantId: 'tenant-123',
          email: 'test@example.com',
          role: 'superadmin' as any,
          invitedBy: 'user-1',
        })
      ).rejects.toThrow('Invalid role');
    });
  });

  describe('Edge Cases', () => {
    test('should allow same email for different tenants', async () => {
      const email = 'shared@example.com';

      const result1 = await useCase.execute({
        tenantId: 'tenant-1',
        email,
        role: 'member',
        invitedBy: 'user-1',
      });

      const result2 = await useCase.execute({
        tenantId: 'tenant-2',
        email,
        role: 'admin',
        invitedBy: 'user-2',
      });

      expect(result1.invitation.email).toBe(email);
      expect(result2.invitation.email).toBe(email);
      expect(result1.invitation.tenantId).not.toBe(result2.invitation.tenantId);
    });

    test('should handle email with plus addressing', async () => {
      const result = await useCase.execute({
        tenantId: 'tenant-123',
        email: 'user+test@example.com',
        role: 'member',
        invitedBy: 'user-1',
      });

      expect(result.invitation.email).toBe('user+test@example.com');
    });
  });
});

