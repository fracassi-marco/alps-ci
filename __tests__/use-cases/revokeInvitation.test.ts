import type { InvitationRepository } from "@/use-cases/createInvitation";
import { describe, it, expect, beforeEach } from 'bun:test';
import type { Invitation } from "@/domain/models";
import { RevokeInvitationUseCase } from "@/use-cases/revokeInvitation";


// Mock repository
class MockInvitationRepository implements InvitationRepository {
  private invitations: Invitation[] = [];

  setInvitations(invitations: Invitation[]) {
    this.invitations = invitations;
  }

  async create(invitation: Omit<Invitation, 'id' | 'createdAt'>): Promise<Invitation> {
    const newInvitation: Invitation = {
      id: `invitation-${Date.now()}`,
      ...invitation,
      createdAt: new Date(),
    };
    this.invitations.push(newInvitation);
    return newInvitation;
  }

  async findById(id: string): Promise<Invitation | null> {
    return this.invitations.find(inv => inv.id === id) || null;
  }

  async findByToken(token: string): Promise<Invitation | null> {
    return this.invitations.find(inv => inv.token === token) || null;
  }

  async findByEmail(email: string): Promise<Invitation[]> {
    return this.invitations.filter(inv => inv.email === email);
  }

  async findPendingByTenantId(tenantId: string): Promise<Invitation[]> {
    return this.invitations.filter(inv => inv.tenantId === tenantId && !inv.acceptedAt);
  }

  async markAsAccepted(invitationId: string): Promise<void> {
    const invitation = this.invitations.find(inv => inv.id === invitationId);
    if (invitation) {
      invitation.acceptedAt = new Date();
    }
  }

  async delete(invitationId: string): Promise<void> {
    this.invitations = this.invitations.filter(inv => inv.id !== invitationId);
  }
}

describe('RevokeInvitationUseCase', () => {
  let useCase: RevokeInvitationUseCase;
  let mockRepository: MockInvitationRepository;

  beforeEach(() => {
    mockRepository = new MockInvitationRepository();
    useCase = new RevokeInvitationUseCase(mockRepository);
  });

  describe('Successful execution', () => {
    it('should validate owner can revoke invitation', async () => {
      // Arrange
      const tenantId = 'tenant-123';
      const invitation: Invitation = {
        id: 'inv-1',
        tenantId,
        email: 'user@example.com',
        role: 'member',
        token: 'token-1',
        invitedBy: 'user-owner',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: null,
        createdAt: new Date('2026-01-10'),
      };
      mockRepository.setInvitations([invitation]);

      // Act & Assert (should not throw)
      await useCase.execute({
        invitationId: 'inv-1',
        tenantId,
        userRole: 'owner',
      });
    });

    it('should validate admin can revoke invitation', async () => {
      // Arrange
      const tenantId = 'tenant-123';
      const invitation: Invitation = {
        id: 'inv-1',
        tenantId,
        email: 'user@example.com',
        role: 'member',
        token: 'token-1',
        invitedBy: 'user-admin',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: null,
        createdAt: new Date('2026-01-10'),
      };
      mockRepository.setInvitations([invitation]);

      // Act & Assert (should not throw)
      await useCase.execute({
        invitationId: 'inv-1',
        tenantId,
        userRole: 'admin',
      });
    });
  });

  describe('Permission validation', () => {
    it('should throw error when member tries to revoke invitation', async () => {
      // Arrange
      const tenantId = 'tenant-123';
      const invitation: Invitation = {
        id: 'inv-1',
        tenantId,
        email: 'user@example.com',
        role: 'member',
        token: 'token-1',
        invitedBy: 'user-owner',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: null,
        createdAt: new Date('2026-01-10'),
      };
      mockRepository.setInvitations([invitation]);

      // Act & Assert
      await expect(
        useCase.execute({
          invitationId: 'inv-1',
          tenantId,
          userRole: 'member',
        })
      ).rejects.toThrow('Only owners and admins can revoke invitations');
    });
  });

  describe('Input validation', () => {
    it('should throw error when invitation ID is empty', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          invitationId: '',
          tenantId: 'tenant-123',
          userRole: 'owner',
        })
      ).rejects.toThrow('Invitation ID is required');
    });

    it('should throw error when tenant ID is empty', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          invitationId: 'inv-1',
          tenantId: '',
          userRole: 'owner',
        })
      ).rejects.toThrow('Tenant ID is required');
    });

    it('should throw error when user role is empty', async () => {
      // Act & Assert
      await expect(
        useCase.execute({
          invitationId: 'inv-1',
          tenantId: 'tenant-123',
          userRole: '' as any,
        })
      ).rejects.toThrow('User role is required');
    });
  });

  describe('Invitation validation', () => {
    it('should throw error when invitation does not exist', async () => {
      // Arrange
      mockRepository.setInvitations([]);

      // Act & Assert
      await expect(
        useCase.execute({
          invitationId: 'non-existent',
          tenantId: 'tenant-123',
          userRole: 'owner',
        })
      ).rejects.toThrow('Invitation not found');
    });

    it('should throw error when invitation belongs to different tenant', async () => {
      // Arrange
      const invitation: Invitation = {
        id: 'inv-1',
        tenantId: 'tenant-456', // Different tenant
        email: 'user@example.com',
        role: 'member',
        token: 'token-1',
        invitedBy: 'user-owner',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: null,
        createdAt: new Date('2026-01-10'),
      };
      mockRepository.setInvitations([invitation]);

      // Act & Assert
      await expect(
        useCase.execute({
          invitationId: 'inv-1',
          tenantId: 'tenant-123',
          userRole: 'owner',
        })
      ).rejects.toThrow('Cannot revoke invitation from another organization');
    });

    it('should throw error when invitation is already accepted', async () => {
      // Arrange
      const invitation: Invitation = {
        id: 'inv-1',
        tenantId: 'tenant-123',
        email: 'user@example.com',
        role: 'member',
        token: 'token-1',
        invitedBy: 'user-owner',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt: new Date('2026-01-11'), // Already accepted
        createdAt: new Date('2026-01-10'),
      };
      mockRepository.setInvitations([invitation]);

      // Act & Assert
      await expect(
        useCase.execute({
          invitationId: 'inv-1',
          tenantId: 'tenant-123',
          userRole: 'owner',
        })
      ).rejects.toThrow('Cannot revoke an invitation that has already been accepted');
    });
  });

  describe('Edge cases', () => {
    it('should handle expired but not accepted invitations', async () => {
      // Arrange
      const invitation: Invitation = {
        id: 'inv-1',
        tenantId: 'tenant-123',
        email: 'user@example.com',
        role: 'member',
        token: 'token-1',
        invitedBy: 'user-owner',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired
        acceptedAt: null,
        createdAt: new Date('2026-01-10'),
      };
      mockRepository.setInvitations([invitation]);

      // Act & Assert (should not throw - expired invitations can be revoked)
      await useCase.execute({
        invitationId: 'inv-1',
        tenantId: 'tenant-123',
        userRole: 'owner',
      });
    });

    it('should validate all invitation roles can be revoked', async () => {
      // Arrange
      const tenantId = 'tenant-123';
      const invitations: Invitation[] = [
        {
          id: 'inv-owner',
          tenantId,
          email: 'owner@example.com',
          role: 'owner',
          token: 'token-owner',
          invitedBy: 'user-owner',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          acceptedAt: null,
          createdAt: new Date('2026-01-10'),
        },
        {
          id: 'inv-admin',
          tenantId,
          email: 'admin@example.com',
          role: 'admin',
          token: 'token-admin',
          invitedBy: 'user-owner',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          acceptedAt: null,
          createdAt: new Date('2026-01-10'),
        },
        {
          id: 'inv-member',
          tenantId,
          email: 'member@example.com',
          role: 'member',
          token: 'token-member',
          invitedBy: 'user-owner',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          acceptedAt: null,
          createdAt: new Date('2026-01-10'),
        },
      ];
      mockRepository.setInvitations(invitations);

      // Act & Assert (should not throw for any role)
      await useCase.execute({
        invitationId: 'inv-owner',
        tenantId,
        userRole: 'owner',
      });

      await useCase.execute({
        invitationId: 'inv-admin',
        tenantId,
        userRole: 'owner',
      });

      await useCase.execute({
        invitationId: 'inv-member',
        tenantId,
        userRole: 'owner',
      });
    });
  });
});

