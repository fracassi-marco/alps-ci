#!/usr/bin/env bun

/**
 * Test database connection and query
 * Run: bun run scripts/test-db.ts
 */

import { db, users, tenants, tenantMembers } from '../src/infrastructure/database';
import { eq } from 'drizzle-orm';

async function test() {
  console.log('🧪 Testing database connection...\n');

  try {
    // Test connection
    console.log('📡 Connecting to database...');
    const result = await db.select().from(users).limit(1);
    console.log('✅ Connection successful!\n');

    // Count users
    const allUsers = await db.select().from(users);
    console.log(`👥 Users in database: ${allUsers.length}`);
    allUsers.forEach(user => {
      console.log(`   - ${user.email} (${user.name})`);
    });

    // Count tenants
    const allTenants = await db.select().from(tenants);
    console.log(`\n🏢 Tenants in database: ${allTenants.length}`);
    allTenants.forEach(tenant => {
      console.log(`   - ${tenant.name} (${tenant.slug})`);
    });

    // Count tenant members
    const allMembers = await db.select().from(tenantMembers);
    console.log(`\n👥 Tenant memberships: ${allMembers.length}`);
    allMembers.forEach(member => {
      console.log(`   - User ${member.userId} → Tenant ${member.tenantId} (${member.role})`);
    });

    console.log('\n✅ Database test completed successfully!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database test failed:', error);
    console.error('\nMake sure:');
    console.error('  1. Database is running: bun run db:start');
    console.error('  2. Schema is pushed: bun run db:push');
    console.error('  3. DATABASE_URL is set in .env.local\n');
    process.exit(1);
  }
}

test();

