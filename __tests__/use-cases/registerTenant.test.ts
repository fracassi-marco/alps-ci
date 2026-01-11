/**
 * Unit Tests for Register Tenant Use Case
 */

import { describe, test, expect, beforeEach } from 'bun:test';
import { RegisterTenantUseCase } from '../../src/use-cases/registerTenant';
import type { Tenant, TenantMember } from '../../src/domain/models';
import type { TenantRepository, TenantMemberRepository } from '../../src/use-cases/registerTenant';

// Mock Repositories
class MockTenantRepository implements TenantRepository {
  private tenants: Map<string, Tenant> = new Map();
  private nextId = 1;

  async create(data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> {
    const tenant: Tenant = {
      id: `tenant-${this.nextId++}`,
      name: data.name,
      slug: data.slug,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tenants.set(tenant.slug, tenant);
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenants.get(slug) || null;
  }

  reset() {
    this.tenants.clear();
    this.nextId = 1;
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

describe('RegisterTenantUseCase', () => {
  let useCase: RegisterTenantUseCase;
  let tenantRepository: MockTenantRepository;
  let tenantMemberRepository: MockTenantMemberRepository;

  beforeEach(() => {
    tenantRepository = new MockTenantRepository();
    tenantMemberRepository = new MockTenantMemberRepository();
    useCase = new RegisterTenantUseCase(tenantRepository, tenantMemberRepository);
  });

  describe('Successful Registration', () => {
    test('should create tenant and associate user as owner', async () => {
      const input = {
        userId: 'user-123',
        tenantName: 'Acme Corporation',
      };

      const result = await useCase.execute(input);

      expect(result.tenant).toBeDefined();
      expect(result.tenant.name).toBe('Acme Corporation');
      expect(result.tenant.slug).toBe('acme-corporation');
      expect(result.tenantMember).toBeDefined();
      expect(result.tenantMember.userId).toBe('user-123');
      expect(result.tenantMember.tenantId).toBe(result.tenant.id);
      expect(result.tenantMember.role).toBe('owner');
      expect(result.tenantMember.invitedBy).toBeNull();
    });

    test('should handle tenant names with special characters', async () => {
      const input = {
        userId: 'user-456',
        tenantName: 'Awesome Tech & Co.!',
      };

      const result = await useCase.execute(input);

      expect(result.tenant.slug).toBe('awesome-tech-co');
    });

    test('should generate unique slug when collision occurs', async () => {
      // Create first tenant
      await useCase.execute({
        userId: 'user-1',
        tenantName: 'Tech Company',
      });

      // Create second tenant with same name
      const result = await useCase.execute({
        userId: 'user-2',
        tenantName: 'Tech Company',
      });

      expect(result.tenant.slug).toBe('tech-company-1');
    });

    test('should handle multiple slug collisions', async () => {
      // Create first tenant
      await useCase.execute({ userId: 'user-1', tenantName: 'Startup' });
      // Create second tenant
      await useCase.execute({ userId: 'user-2', tenantName: 'Startup' });
      // Create third tenant
      const result = await useCase.execute({ userId: 'user-3', tenantName: 'Startup' });

      expect(result.tenant.slug).toBe('startup-2');
    });
  });

  describe('Validation', () => {
    test('should throw error for empty tenant name', async () => {
      const input = {
        userId: 'user-123',
        tenantName: '',
      };

      await expect(useCase.execute(input)).rejects.toThrow('Tenant name is required');
    });

    test('should throw error for tenant name with only whitespace', async () => {
      const input = {
        userId: 'user-123',
        tenantName: '   ',
      };

      await expect(useCase.execute(input)).rejects.toThrow('Tenant name cannot be empty');
    });

    test('should throw error for tenant name exceeding max length', async () => {
      const input = {
        userId: 'user-123',
        tenantName: 'A'.repeat(101),
      };

      await expect(useCase.execute(input)).rejects.toThrow('Tenant name must not exceed 100 characters');
    });

    test('should accept tenant name at max length boundary', async () => {
      const input = {
        userId: 'user-123',
        tenantName: 'A'.repeat(100),
      };

      const result = await useCase.execute(input);
      expect(result.tenant.name).toBe('A'.repeat(100));
    });
  });

  describe('Edge Cases', () => {
    test('should handle tenant name with emojis', async () => {
      const input = {
        userId: 'user-789',
        tenantName: 'Tech Company 🚀',
      };

      const result = await useCase.execute(input);
      expect(result.tenant.name).toBe('Tech Company 🚀');
      expect(result.tenant.slug).toBe('tech-company');
    });

    test('should handle tenant name with numbers', async () => {
      const input = {
        userId: 'user-101',
        tenantName: 'Company 123',
      };

      const result = await useCase.execute(input);
      expect(result.tenant.slug).toBe('company-123');
    });

    test('should throw error if unable to generate unique slug after max attempts', async () => {
      // Create 10 tenants with same name
      for (let i = 0; i < 10; i++) {
        await useCase.execute({ userId: `user-${i}`, tenantName: 'Test' });
      }

      // Try to create 11th tenant
      await expect(
        useCase.execute({ userId: 'user-11', tenantName: 'Test' })
      ).rejects.toThrow('Unable to generate unique tenant slug');
    });

    test('should set correct timestamps', async () => {
      const before = new Date();
      const result = await useCase.execute({
        userId: 'user-999',
        tenantName: 'Time Test Co',
      });
      const after = new Date();

      expect(result.tenant.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.tenant.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
      expect(result.tenantMember.joinedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.tenantMember.joinedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });
});

