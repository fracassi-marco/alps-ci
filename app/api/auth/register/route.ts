import { NextRequest, NextResponse } from 'next/server';
import { RegisterTenantUseCase } from '@/use-cases/registerTenant';
import { DatabaseTenantRepository } from '@/infrastructure/TenantRepository';
import { db } from '@/infrastructure/database/client';
import { users, accounts } from '@/infrastructure/database/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import {DatabaseTenantMemberRepository} from "@/infrastructure/DatabaseTenantMemberRepository.ts";

const tenantRepository = new DatabaseTenantRepository();
const tenantMemberRepository = new DatabaseTenantMemberRepository();
const registerTenantUseCase = new RegisterTenantUseCase(tenantRepository, tenantMemberRepository);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, tenantName } = body;

    // Validate required fields
    if (!name || !email || !password || !tenantName) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password using bcrypt (same algorithm better-auth uses)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in database
    const [user] = await db
      .insert(users)
      .values({
        email,
        name,
        emailVerified: false,
      })
      .returning();

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

    // Create account record with password for better-auth email/password authentication
    await db
      .insert(accounts)
      .values({
        userId: user.id,
        accountId: user.email, // Use email as accountId for email/password auth
        providerId: 'credential', // better-auth uses 'credential' for email/password
        password: hashedPassword,
      });

    // Create tenant and associate user as owner
    const { tenant } = await registerTenantUseCase.execute({
      userId: user.id,
      tenantName,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
      message: 'Account created successfully. Redirecting to dashboard...',
    });

  } catch (error: any) {
    console.error('[Register API] Error:', error);

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Handle unique constraint violations
    if (error.code === 'SQLITE_CONSTRAINT' || error.message?.includes('UNIQUE constraint')) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}

