#!/usr/bin/env bun

/**
 * Database seeding script for development
 * Run: bun run db:seed
 */

import { db, users, tenants, tenantMembers, accounts } from '../src/infrastructure/database';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...\n');

  try {
    // Seed user
    console.log('👤 Creating seed user...');
    const [user] = await db
      .insert(users)
      .values({
        id: '00000000-0000-0000-0000-000000000001',
        email: 'dev@example.com',
        name: 'Dev User',
        emailVerified: true,
      })
      .onConflictDoNothing()
      .returning();

    if (user) {
      console.log(`   ✅ User created: ${user.email}`);

      // Create password account for better-auth
      const hashedPassword = await bcrypt.hash('password123', 10);
      await db
        .insert(accounts)
        .values({
          userId: user.id,
          accountId: user.email,
          providerId: 'credential',
          password: hashedPassword,
        })
        .onConflictDoNothing();
      console.log('   ✅ Password account created');
    } else {
      console.log('   ℹ️  User already exists');
    }

    // Seed tenant
    console.log('\n🏢 Creating seed tenant...');
    const [tenant] = await db
      .insert(tenants)
      .values({
        id: '00000000-0000-0000-0000-000000000002',
        name: 'Development Team',
        slug: 'development-team',
      })
      .onConflictDoNothing()
      .returning();

    if (tenant) {
      console.log(`   ✅ Tenant created: ${tenant.name} (${tenant.slug})`);
    } else {
      console.log('   ℹ️  Tenant already exists');
    }

    // Seed tenant member
    console.log('\n👥 Creating tenant membership...');
    const [member] = await db
      .insert(tenantMembers)
      .values({
        tenantId: '00000000-0000-0000-0000-000000000002',
        userId: '00000000-0000-0000-0000-000000000001',
        role: 'owner',
      })
      .onConflictDoNothing()
      .returning();

    if (member) {
      console.log('   ✅ Tenant membership created (role: owner)');
    } else {
      console.log('   ℹ️  Tenant membership already exists');
    }

    console.log('\n✅ Database seeding completed successfully!\n');
    console.log('📧 Dev user email: dev@example.com');
    console.log('🔑 Dev user password: password123');
    console.log('🏢 Tenant: Development Team (development-team)\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed();

