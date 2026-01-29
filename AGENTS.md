# AGENTS.md - Coding Agent Guidelines

This document provides coding agents with essential information about this codebase's structure, conventions, and workflows.

---

## 🏗️ Project Overview

**Alps-CI** is a multi-tenant CI dashboard for GitHub Actions built with:
- **Runtime**: Bun
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript (strict mode)
- **Database**: Drizzle ORM (SQLite dev, PostgreSQL prod)
- **Auth**: better-auth
- **Styling**: TailwindCSS v4
- **Testing**: Bun test + Playwright

**Architecture**: Clean Architecture with strict separation of concerns.

---

## 🔧 Build/Lint/Test Commands

### Development
```bash
bun run dev              # Start dev server on port 3000
bun run build            # Production build
bun run start            # Start production server
bun run lint             # Run Next.js ESLint
```

### Testing
```bash
bun test                 # Run all unit tests in __tests__/
bun test __tests__/domain/  # Run tests in specific directory
bun test __tests__/use-cases/addBuild.test.ts  # Run single test file
bun test --watch         # Run tests in watch mode
bun run test:all         # Run all tests (alias)
bun run test:e2e         # Run Playwright E2E tests
bun run test:e2e:ui      # Run E2E tests with UI
bun run test:e2e:headed  # Run E2E tests in headed mode
bun run test:e2e:debug   # Debug E2E tests
```

### Database
```bash
bun run db:generate      # Generate migrations from schema
bun run db:migrate       # Run migrations
bun run auth:generate-secret  # Generate auth secret
```

### Type Checking
```bash
bun tsc --noEmit         # Type check without emitting files
```

---

## 📁 Directory Structure

```
app/                     # Next.js App Router - UI layer
  ├── components/        # Client-side React components
  ├── hooks/             # Custom React hooks
  ├── api/               # API route handlers (route.ts)
  ├── auth/              # Authentication pages
  ├── builds/            # Build-related pages
  └── layout.tsx         # Root layout

src/                     # Business logic (Clean Architecture)
  ├── domain/            # Pure business logic, models, validation
  ├── use-cases/         # Application orchestration
  └── infrastructure/    # External services (DB, GitHub API, auth)

__tests__/               # Test files (mirrors src/ structure)
  ├── domain/
  ├── use-cases/
  ├── infrastructure/
  ├── components/
  └── hooks/

scripts/                 # Utility scripts (migrations, etc.)
public/                  # Static assets
data/                    # SQLite database (local dev only)
```

---

## 🎯 Code Style Guidelines

### Import Conventions

**Order**: External packages → Internal utilities → Components → Domain types → Type imports

```typescript
// 1. External packages
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// 2. Internal utilities/infrastructure
import { useSession, signOut } from '@/infrastructure/auth-client';
import { db } from '@/infrastructure/database/client';

// 3. Components
import { BuildCard } from './components/BuildCard';

// 4. Domain types
import { Build, Selector } from '@/domain/models';

// 5. Type-only imports (last)
import type { BuildStats } from '@/domain/models';
```

**Path Aliases**: Use `@/*` for `src/*` imports.

```typescript
import { Build } from '@/domain/models';
import { ListBuildsUseCase } from '@/use-cases/listBuilds';
```

**No Barrel Exports**: Always use explicit imports from the specific file.

```typescript
// ✅ Correct - explicit import
import { Build } from '@/domain/models';
import { AddBuildUseCase } from '@/use-cases/addBuild';
import { getCurrentUser } from '@/infrastructure/auth-session';

// ❌ Wrong - barrel export (index.ts)
import { Build } from '@/domain';
import { AddBuildUseCase } from '@/use-cases';
import { getCurrentUser } from '@/infrastructure';
```

**Why?** Barrel exports (index.ts files) cause IDE warnings, reduce clarity about where code comes from, and can impact build performance. This project intentionally avoids them.

### TypeScript Patterns

**Strict Configuration**: All strict flags enabled including `noUncheckedIndexedAccess`.

```typescript
// Use interfaces for object shapes
export interface Build {
  id: string;
  tenantId: string;
  name: string;
  createdAt: Date;
}

// Use types for unions and aliases
export type Role = 'owner' | 'admin' | 'member';
export type SelectorType = 'tag' | 'branch' | 'workflow';

// Type-only imports when used only as types
import type { Build } from '@/domain/models';

// Utility types are heavily used
Omit<Build, 'id' | 'createdAt' | 'updatedAt'>
Partial<Build>
```

**Always handle undefined from array access** due to `noUncheckedIndexedAccess`:

```typescript
const first = array[0]; // Type: Element | undefined
if (first) {
  // Use first safely
}
```

### Naming Conventions

- **Files**:
  - Components: `PascalCase.tsx` (e.g., `BuildCard.tsx`)
  - Pages: `page.tsx`, `layout.tsx`
  - API Routes: `route.ts`
  - Hooks: `useViewMode.ts`
  - Use Cases: `addBuild.ts`, `listBuilds.ts`
  - Repositories: `DatabaseBuildRepository.ts`
  - Tests: `*.test.ts` or `*.test.tsx`

- **Components**: PascalCase, named exports
  ```typescript
  export function BuildCard({ build }: BuildCardProps) { ... }
  ```

- **Functions**: camelCase with descriptive verbs
  ```typescript
  fetchBuilds()
  handleSubmit()
  validateBuild()
  isValidEmail()      // Boolean functions: is/can/has prefix
  ```

- **Variables**: camelCase
  ```typescript
  const buildStats = ...;
  ```

- **Constants**: UPPER_SNAKE_CASE
  ```typescript
  const CACHE_EXPIRATION_MIN = 1;
  const MAX_RETRIES = 3;
  ```

- **Classes**: PascalCase with suffix
  ```typescript
  class AddBuildUseCase { ... }
  class DatabaseBuildRepository { ... }
  class ValidationError extends Error { ... }
  ```

### Formatting

- **Indentation**: 2 spaces
- **Line Length**: Aim for 100-120 chars
- **Semicolons**: Always use semicolons
- **Quotes**: Single quotes for strings, double for JSX
- **Trailing Commas**: Yes (ES5+)

---

## 🏛️ Architecture Patterns

### Clean Architecture Layers

**Domain** (`src/domain/`):
- Pure TypeScript, no external dependencies
- Models, validation, business logic
- No framework imports

```typescript
// src/domain/models.ts
export interface Build {
  id: string;
  tenantId: string;
  name: string;
}

// src/domain/validation.ts
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateBuild(build: Partial<Build>): void {
  if (!build.name) throw new ValidationError('Build name is required');
}
```

**Use Cases** (`src/use-cases/`):
- Application logic
- Orchestrate domain and infrastructure
- Depend on repository interfaces, not implementations

```typescript
export interface BuildRepository {
  findAll(tenantId: string): Promise<Build[]>;
  create(build: Omit<Build, 'id' | 'createdAt'>, tenantId: string): Promise<Build>;
}

export class AddBuildUseCase {
  constructor(private repository: BuildRepository) {}
  
  async execute(build: Omit<Build, 'id' | 'createdAt'>, tenantId: string): Promise<Build> {
    validateBuild(build);
    return await this.repository.create(build, tenantId);
  }
}
```

**Infrastructure** (`src/infrastructure/`):
- External dependencies (DB, APIs, auth)
- Implements repository interfaces

```typescript
export class DatabaseBuildRepository implements BuildRepository {
  async findAll(tenantId: string): Promise<Build[]> {
    const results = await db
      .select()
      .from(builds)
      .where(eq(builds.tenantId, tenantId));
    return results.map(this.mapToModel);
  }
  
  private mapToModel(row: any): Build {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      createdAt: new Date(row.createdAt),
    };
  }
}
```

**UI** (`app/`):
- Next.js pages, components, API routes
- Presentation layer only

### Multi-Tenant Architecture

**All data is tenant-scoped**. Every user belongs to tenants via `tenant_members`.

```typescript
// Always scope queries by tenantId
const builds = await db
  .select()
  .from(builds)
  .where(eq(builds.tenantId, tenantId));

// Every API route must get user's tenant
const currentUser = await getCurrentUser();
const memberships = await tenantMemberRepository.findByUserId(currentUser.id);
const tenantId = memberships[0]?.tenantId;
```

---

## 🛡️ Error Handling

### Custom Error Classes

```typescript
// Domain errors
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Infrastructure errors
export class GitHubAPIError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'GitHubAPIError';
  }
}
```

### API Route Pattern

```typescript
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const data = await useCase.execute(params);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to X:', error);
    
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    
    return NextResponse.json({ error: 'Failed to X' }, { status: 500 });
  }
}
```

### Client-Side Pattern

```typescript
try {
  const response = await fetch('/api/builds');
  if (!response.ok) throw new Error('Failed to fetch');
  const data = await response.json();
  setData(data);
} catch (error) {
  console.error('Failed to fetch:', error);
  setError('Failed to load data. Please try again.');
}
```

---

## 🧪 Testing Patterns

### Test Structure

```typescript
import { describe, it, expect, mock, beforeEach } from 'bun:test';

describe('ListBuildsUseCase', () => {
  const tenantId = 'tenant-123';
  
  it('should return all builds for tenant', async () => {
    const mockBuilds: Build[] = [mockBuild1, mockBuild2];
    const mockRepository = {
      findAll: mock(() => Promise.resolve(mockBuilds)),
    };
    
    const useCase = new ListBuildsUseCase(mockRepository);
    const result = await useCase.execute(tenantId);
    
    expect(result).toEqual(mockBuilds);
    expect(mockRepository.findAll).toHaveBeenCalledWith(tenantId);
  });
});
```

### Mocking

```typescript
// Mock functions
const mockPush = mock(() => {});

// Mock modules
mock.module('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock fetch
global.fetch = mock(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({ data: 'test' }),
})) as any;
```

---

## 🔐 Authentication Patterns

### Session Management

```typescript
// Server-side (API routes, server components)
import { getCurrentUser } from '@/infrastructure/auth-session';

const currentUser = await getCurrentUser();
if (!currentUser) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Client-side (React components)
import { useSession } from '@/infrastructure/auth-client';

const { data: session, isPending } = useSession();
if (!session) {
  router.push('/auth/signin');
}
```

---

## 📊 Database Patterns

### Drizzle ORM Usage

```typescript
import { eq, and } from 'drizzle-orm';

// Single condition
.where(eq(builds.tenantId, tenantId))

// Multiple conditions
.where(and(
  eq(builds.id, id),
  eq(builds.tenantId, tenantId)
))

// Insert with returning
const [created] = await db
  .insert(builds)
  .values({ tenantId, ...data })
  .returning();

// Update
await db
  .update(builds)
  .set(updates)
  .where(and(eq(builds.id, id), eq(builds.tenantId, tenantId)));
```

### Schema Definition

```typescript
export const builds = sqliteTable('builds', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  tenantId: text('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
  tenantIdIdx: index('idx_builds_tenant_id').on(table.tenantId),
}));
```

---

## ✅ Commit Guidelines

Use [gitmoji](https://gitmoji.dev/) for semantic commits. **Max 128 characters.**

```bash
✨ Add support for workflow filtering
🐛 Fix cache expiration calculation
📝 Update API documentation
♻️ Refactor BuildCard component
✅ Add tests for addBuild use case
🔒 Encrypt GitHub tokens in database
```

---

## 🚨 Important Notes

- **All operations are tenant-scoped** - Never forget to filter by `tenantId`
- **Use async/await**, never `.then()` chains
- **Always validate input** before processing
- **Handle array access safely** due to `noUncheckedIndexedAccess`
- **Test everything** - Aim for 100% coverage of critical paths
- **Keep components small** - Extract logic to hooks or utils
- **No `any` types** - Use `unknown` and type guards instead
- **Drizzle queries return arrays** - Use `[result]` or check length
- **E2E tests are local-only** - Not run in CI
- **Prefer Edit over Write** for existing files
- **No barrel exports** - Always import from specific files, never from `index.ts` files
