/**
 * Use Case: Register Tenant
 *
 * Creates a new tenant (company) and associates the first user as owner.
 * This is the primary onboarding flow for new users.
 */

import type { Tenant, TenantMember, User } from '../domain/models';
import { validateTenantName, generateSlug } from '../domain/validation';

export interface RegisterTenantInput {
  userId: string;
  tenantName: string;
}

export interface RegisterTenantOutput {
  tenant: Tenant;
  tenantMember: TenantMember;
}

export interface TenantRepository {
  create(tenant: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant>;
  findBySlug(slug: string): Promise<Tenant | null>;
}

export interface TenantMemberRepository {
  create(member: Omit<TenantMember, 'id' | 'createdAt'>): Promise<TenantMember>;
  findByUserIdAndTenantId(userId: string, tenantId: string): Promise<TenantMember | null>;
  findById(id: string): Promise<TenantMember | null>;
  findByUserId(userId: string): Promise<TenantMember[]>;
  findByTenantId(tenantId: string): Promise<TenantMember[]>;
  updateMemberRole(memberId: string, newRole: 'owner' | 'admin' | 'member'): Promise<void>;
}

export class RegisterTenantUseCase {
  constructor(
    private tenantRepository: TenantRepository,
    private tenantMemberRepository: TenantMemberRepository
  ) {}

  async execute(input: RegisterTenantInput): Promise<RegisterTenantOutput> {
    // Validate tenant name
    validateTenantName(input.tenantName);

    // Generate slug and ensure uniqueness
    let slug = generateSlug(input.tenantName);
    let attempt = 0;
    const maxAttempts = 10;

    while (attempt < maxAttempts) {
      const existing = await this.tenantRepository.findBySlug(slug);
      if (!existing) break;

      attempt++;
      slug = `${generateSlug(input.tenantName)}-${attempt}`;
    }

    if (attempt >= maxAttempts) {
      throw new Error('Unable to generate unique tenant slug. Please try a different name.');
    }

    // Create tenant
    const tenant = await this.tenantRepository.create({
      name: input.tenantName,
      slug,
    });

    // Associate user as owner
    const tenantMember = await this.tenantMemberRepository.create({
      tenantId: tenant.id,
      userId: input.userId,
      role: 'owner',
      invitedBy: null,
      joinedAt: new Date(),
    });

    return {
      tenant,
      tenantMember,
    };
  }
}

