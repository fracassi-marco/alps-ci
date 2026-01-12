/**
 * Database Repository for Tenants
 * Implements tenant CRUD operations using Drizzle ORM
 */

import { eq, and } from 'drizzle-orm';
import { db } from './database/client';
import { tenants, tenantMembers } from './database/schema';
import type { Tenant, TenantMember } from '../domain/models';
import type { TenantRepository, TenantMemberRepository } from '../use-cases/registerTenant';

export class DatabaseTenantRepository implements TenantRepository {
  async create(data: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Promise<Tenant> {
    const [tenant] = await db
      .insert(tenants)
      .values({
        name: data.name,
        slug: data.slug,
      })
      .returning();

    if (!tenant) {
      throw new Error('Failed to create tenant');
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      createdAt: new Date(tenant.createdAt),
      updatedAt: new Date(tenant.updatedAt),
    };
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    if (!tenant) return null;

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      createdAt: new Date(tenant.createdAt),
      updatedAt: new Date(tenant.updatedAt),
    };
  }

  async findById(id: string): Promise<Tenant | null> {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);

    if (!tenant) return null;

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      createdAt: new Date(tenant.createdAt),
      updatedAt: new Date(tenant.updatedAt),
    };
  }
}

export class DatabaseTenantMemberRepository implements TenantMemberRepository {
  async create(data: Omit<TenantMember, 'id' | 'createdAt'>): Promise<TenantMember> {
    const [member] = await db
      .insert(tenantMembers)
      .values({
        tenantId: data.tenantId,
        userId: data.userId,
        role: data.role,
        invitedBy: data.invitedBy,
        joinedAt: data.joinedAt,
      })
      .returning();

    if (!member) {
      throw new Error('Failed to create tenant member');
    }

    return {
      id: member.id,
      tenantId: member.tenantId,
      userId: member.userId,
      role: member.role as 'owner' | 'admin' | 'member',
      invitedBy: member.invitedBy,
      joinedAt: new Date(member.joinedAt),
      createdAt: new Date(member.createdAt),
    };
  }

  async findByUserIdAndTenantId(userId: string, tenantId: string): Promise<TenantMember | null> {
    const [member] = await db
      .select()
      .from(tenantMembers)
      .where(and(
        eq(tenantMembers.userId, userId),
        eq(tenantMembers.tenantId, tenantId)
      ))
      .limit(1);

    if (!member) return null;

    return {
      id: member.id,
      tenantId: member.tenantId,
      userId: member.userId,
      role: member.role as 'owner' | 'admin' | 'member',
      invitedBy: member.invitedBy,
      joinedAt: new Date(member.joinedAt),
      createdAt: new Date(member.createdAt),
    };
  }

  async findByUserId(userId: string): Promise<TenantMember[]> {
    const members = await db
      .select()
      .from(tenantMembers)
      .where(eq(tenantMembers.userId, userId));

    return members.map((member: any) => ({
      id: member.id,
      tenantId: member.tenantId,
      userId: member.userId,
      role: member.role as 'owner' | 'admin' | 'member',
      invitedBy: member.invitedBy,
      joinedAt: new Date(member.joinedAt),
      createdAt: new Date(member.createdAt),
    }));
  }

  async findByTenantId(tenantId: string): Promise<TenantMember[]> {
    const members = await db
      .select()
      .from(tenantMembers)
      .where(eq(tenantMembers.tenantId, tenantId));

    return members.map((member: any) => ({
      id: member.id,
      tenantId: member.tenantId,
      userId: member.userId,
      role: member.role as 'owner' | 'admin' | 'member',
      invitedBy: member.invitedBy,
      joinedAt: new Date(member.joinedAt),
      createdAt: new Date(member.createdAt),
    }));
  }
}

