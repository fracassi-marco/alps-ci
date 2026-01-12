/**
 * Database Repository for Tenants
 * Implements tenant CRUD operations using Drizzle ORM
 */

import {eq} from 'drizzle-orm';
import {db} from './database/client';
import {tenants} from './database/schema';
import type {Tenant} from '../domain/models';
import type {TenantRepository} from '../use-cases/registerTenant';

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

