import type {TenantMemberRepository} from "@/use-cases/registerTenant.ts";
import type {TenantMember} from "@/domain/models.ts";
import {db, tenantMembers} from "@/infrastructure/database";
import {and, eq} from "drizzle-orm";

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

  async findById(id: string): Promise<TenantMember | null> {
    const [member] = await db
      .select()
      .from(tenantMembers)
      .where(eq(tenantMembers.id, id))
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

  async updateMemberRole(memberId: string, newRole: 'owner' | 'admin' | 'member'): Promise<void> {
    await db
      .update(tenantMembers)
      .set({role: newRole})
      .where(eq(tenantMembers.id, memberId));
  }
}
