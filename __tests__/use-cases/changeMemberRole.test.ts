import { describe, it, expect, beforeEach } from 'bun:test';
import { ChangeMemberRoleUseCase } from '../../src/use-cases/changeMemberRole';
import type { TenantMemberRepository } from '../../src/use-cases/registerTenant';
import type { TenantMember } from '../../src/domain/models';

// Mock repository
class MockTenantMemberRepository implements TenantMemberRepository {
  private members: TenantMember[] = [];

  setMembers(members: TenantMember[]) {
    this.members = members;
  }

  async create(data: Omit<TenantMember, 'id' | 'createdAt'>): Promise<TenantMember> {
    const member: TenantMember = {
      id: `member-${Date.now()}`,
      ...data,
      createdAt: new Date(),
    };
    this.members.push(member);
    return member;
  }

  async findByUserIdAndTenantId(userId: string, tenantId: string): Promise<TenantMember | null> {
    return this.members.find(m => m.userId === userId && m.tenantId === tenantId) || null;
  }

  async findById(id: string): Promise<TenantMember | null> {
    return this.members.find(m => m.id === id) || null;
  }

  async findByUserId(userId: string): Promise<TenantMember[]> {
    return this.members.filter(m => m.userId === userId);
  }

  async findByTenantId(tenantId: string): Promise<TenantMember[]> {
    return this.members.filter(m => m.tenantId === tenantId);
  }

  async updateMemberRole(memberId: string, newRole: 'owner' | 'admin' | 'member'): Promise<void> {
    const member = this.members.find(m => m.id === memberId);
    if (member) {
      member.role = newRole;
    }
  }
}

describe('ChangeMemberRoleUseCase', () => {
  let useCase: ChangeMemberRoleUseCase;
  let mockRepository: MockTenantMemberRepository;

  beforeEach(() => {
    mockRepository = new MockTenantMemberRepository();
    useCase = new ChangeMemberRoleUseCase(mockRepository);
  });

  describe('Successful role changes', () => {
    it('should allow owner to change member to admin', async () => {
      const tenantId = 'tenant-123';
      const members: TenantMember[] = [
        {
          id: 'member-1',
          tenantId,
          userId: 'user-owner',
          role: 'owner',
          invitedBy: null,
          joinedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'member-2',
          tenantId,
          userId: 'user-member',
          role: 'member',
          invitedBy: 'user-owner',
          joinedAt: new Date(),
          createdAt: new Date(),
        },
      ];
      mockRepository.setMembers(members);

      await useCase.execute({
        userId: 'user-owner',
        targetMemberId: 'member-2',
        newRole: 'admin',
        tenantId,
      });

      const updatedMember = await mockRepository.findById('member-2');
      expect(updatedMember?.role).toBe('admin');
    });

    it('should allow admin to change member to admin', async () => {
      const tenantId = 'tenant-123';
      const members: TenantMember[] = [
        {
          id: 'member-1',
          tenantId,
          userId: 'user-admin',
          role: 'admin',
          invitedBy: 'user-owner',
          joinedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'member-2',
          tenantId,
          userId: 'user-member',
          role: 'member',
          invitedBy: 'user-owner',
          joinedAt: new Date(),
          createdAt: new Date(),
        },
      ];
      mockRepository.setMembers(members);

      await useCase.execute({
        userId: 'user-admin',
        targetMemberId: 'member-2',
        newRole: 'admin',
        tenantId,
      });

      const updatedMember = await mockRepository.findById('member-2');
      expect(updatedMember?.role).toBe('admin');
    });

    it('should allow owner to promote member to owner', async () => {
      const tenantId = 'tenant-123';
      const members: TenantMember[] = [
        {
          id: 'member-1',
          tenantId,
          userId: 'user-owner',
          role: 'owner',
          invitedBy: null,
          joinedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'member-2',
          tenantId,
          userId: 'user-member',
          role: 'member',
          invitedBy: 'user-owner',
          joinedAt: new Date(),
          createdAt: new Date(),
        },
      ];
      mockRepository.setMembers(members);

      await useCase.execute({
        userId: 'user-owner',
        targetMemberId: 'member-2',
        newRole: 'owner',
        tenantId,
      });

      const updatedMember = await mockRepository.findById('member-2');
      expect(updatedMember?.role).toBe('owner');
    });

    it('should allow owner to demote admin to member', async () => {
      const tenantId = 'tenant-123';
      const members: TenantMember[] = [
        {
          id: 'member-1',
          tenantId,
          userId: 'user-owner',
          role: 'owner',
          invitedBy: null,
          joinedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'member-2',
          tenantId,
          userId: 'user-admin',
          role: 'admin',
          invitedBy: 'user-owner',
          joinedAt: new Date(),
          createdAt: new Date(),
        },
      ];
      mockRepository.setMembers(members);

      await useCase.execute({
        userId: 'user-owner',
        targetMemberId: 'member-2',
        newRole: 'member',
        tenantId,
      });

      const updatedMember = await mockRepository.findById('member-2');
      expect(updatedMember?.role).toBe('member');
    });
  });

  describe('Permission validation', () => {
    it('should throw error when member tries to change roles', async () => {
      const tenantId = 'tenant-123';
      const members: TenantMember[] = [
        {
          id: 'member-1',
          tenantId,
          userId: 'user-member1',
          role: 'member',
          invitedBy: 'user-owner',
          joinedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'member-2',
          tenantId,
          userId: 'user-member2',
          role: 'member',
          invitedBy: 'user-owner',
          joinedAt: new Date(),
          createdAt: new Date(),
        },
      ];
      mockRepository.setMembers(members);

      await expect(
        useCase.execute({
          userId: 'user-member1',
          targetMemberId: 'member-2',
          newRole: 'admin',
          tenantId,
        })
      ).rejects.toThrow('Only owners and admins can change member roles');
    });

    it('should throw error when admin tries to promote to owner', async () => {
      const tenantId = 'tenant-123';
      const members: TenantMember[] = [
        {
          id: 'member-1',
          tenantId,
          userId: 'user-admin',
          role: 'admin',
          invitedBy: 'user-owner',
          joinedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'member-2',
          tenantId,
          userId: 'user-member',
          role: 'member',
          invitedBy: 'user-owner',
          joinedAt: new Date(),
          createdAt: new Date(),
        },
      ];
      mockRepository.setMembers(members);

      await expect(
        useCase.execute({
          userId: 'user-admin',
          targetMemberId: 'member-2',
          newRole: 'owner',
          tenantId,
        })
      ).rejects.toThrow('Only owners can promote members to owner');
    });
  });

  describe('Self-change protection', () => {
    it('should throw error when user tries to change own role', async () => {
      const tenantId = 'tenant-123';
      const members: TenantMember[] = [
        {
          id: 'member-1',
          tenantId,
          userId: 'user-owner',
          role: 'owner',
          invitedBy: null,
          joinedAt: new Date(),
          createdAt: new Date(),
        },
      ];
      mockRepository.setMembers(members);

      await expect(
        useCase.execute({
          userId: 'user-owner',
          targetMemberId: 'member-1',
          newRole: 'admin',
          tenantId,
        })
      ).rejects.toThrow('You cannot change your own role');
    });
  });

  describe('Last owner protection', () => {
    it('should throw error when demoting last owner', async () => {
      const tenantId = 'tenant-123';
      const members: TenantMember[] = [
        {
          id: 'member-1',
          tenantId,
          userId: 'user-owner',
          role: 'owner',
          invitedBy: null,
          joinedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'member-2',
          tenantId,
          userId: 'user-admin',
          role: 'admin',
          invitedBy: 'user-owner',
          joinedAt: new Date(),
          createdAt: new Date(),
        },
      ];
      mockRepository.setMembers(members);

      await expect(
        useCase.execute({
          userId: 'user-admin',
          targetMemberId: 'member-1',
          newRole: 'admin',
          tenantId,
        })
      ).rejects.toThrow('Cannot demote the last owner');
    });

    it('should allow demoting owner when there are multiple owners', async () => {
      const tenantId = 'tenant-123';
      const members: TenantMember[] = [
        {
          id: 'member-1',
          tenantId,
          userId: 'user-owner1',
          role: 'owner',
          invitedBy: null,
          joinedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'member-2',
          tenantId,
          userId: 'user-owner2',
          role: 'owner',
          invitedBy: null,
          joinedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'member-3',
          tenantId,
          userId: 'user-owner3',
          role: 'owner',
          invitedBy: null,
          joinedAt: new Date(),
          createdAt: new Date(),
        },
      ];
      mockRepository.setMembers(members);

      await useCase.execute({
        userId: 'user-owner1',
        targetMemberId: 'member-2',
        newRole: 'admin',
        tenantId,
      });

      const updatedMember = await mockRepository.findById('member-2');
      expect(updatedMember?.role).toBe('admin');
    });
  });

  describe('Input validation', () => {
    it('should throw error when userId is empty', async () => {
      await expect(
        useCase.execute({
          userId: '',
          targetMemberId: 'member-1',
          newRole: 'admin',
          tenantId: 'tenant-123',
        })
      ).rejects.toThrow('User ID is required');
    });

    it('should throw error when targetMemberId is empty', async () => {
      await expect(
        useCase.execute({
          userId: 'user-1',
          targetMemberId: '',
          newRole: 'admin',
          tenantId: 'tenant-123',
        })
      ).rejects.toThrow('Target member ID is required');
    });

    it('should throw error when newRole is invalid', async () => {
      await expect(
        useCase.execute({
          userId: 'user-1',
          targetMemberId: 'member-1',
          newRole: 'superadmin' as any,
          tenantId: 'tenant-123',
        })
      ).rejects.toThrow('Invalid role');
    });

    it('should throw error when tenantId is empty', async () => {
      await expect(
        useCase.execute({
          userId: 'user-1',
          targetMemberId: 'member-1',
          newRole: 'admin',
          tenantId: '',
        })
      ).rejects.toThrow('Tenant ID is required');
    });
  });

  describe('Member validation', () => {
    it('should throw error when target member not found', async () => {
      const tenantId = 'tenant-123';
      const members: TenantMember[] = [
        {
          id: 'member-1',
          tenantId,
          userId: 'user-owner',
          role: 'owner',
          invitedBy: null,
          joinedAt: new Date(),
          createdAt: new Date(),
        },
      ];
      mockRepository.setMembers(members);

      await expect(
        useCase.execute({
          userId: 'user-owner',
          targetMemberId: 'member-999',
          newRole: 'admin',
          tenantId,
        })
      ).rejects.toThrow('Member not found');
    });

    it('should throw error when target member belongs to different tenant', async () => {
      const members: TenantMember[] = [
        {
          id: 'member-1',
          tenantId: 'tenant-123',
          userId: 'user-owner',
          role: 'owner',
          invitedBy: null,
          joinedAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'member-2',
          tenantId: 'tenant-456',
          userId: 'user-member',
          role: 'member',
          invitedBy: 'user-owner2',
          joinedAt: new Date(),
          createdAt: new Date(),
        },
      ];
      mockRepository.setMembers(members);

      await expect(
        useCase.execute({
          userId: 'user-owner',
          targetMemberId: 'member-2',
          newRole: 'admin',
          tenantId: 'tenant-123',
        })
      ).rejects.toThrow('Cannot change role of member from another organization');
    });
  });
});

