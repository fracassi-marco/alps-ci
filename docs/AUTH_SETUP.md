# Authentication Setup

Alps-CI uses [better-auth](https://better-auth.com) for authentication with support for:
- Email/Password authentication
- Google OAuth
- Multi-tenant session management

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/alpsci

# Authentication
BETTER_AUTH_SECRET=your-secret-key-at-least-32-characters-long
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Generate Auth Secret

```bash
openssl rand -base64 32
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Application type: "Web application"
6. Authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)
7. Copy Client ID and Client Secret to your `.env.local`

## Database Setup

The authentication system requires PostgreSQL. Run the migration to create necessary tables:

```bash
# Will be added in next step (10.2)
bun run db:migrate
```

## Usage

### Server-side (API routes, Server Components)

```typescript
import { requireAuth, getCurrentUser } from '@/infrastructure/auth-session';

// Require authentication
const session = await requireAuth();

// Get current user (returns null if not authenticated)
const user = await getCurrentUser();
```

### Client-side (React Components)

```typescript
'use client';

import { useSession, signIn, signOut } from '@/infrastructure/auth-client';

function MyComponent() {
  const { data: session, isPending } = useSession();

  if (isPending) return <div>Loading...</div>;
  
  if (!session) {
    return (
      <button onClick={() => signIn.email({ email, password })}>
        Sign In
      </button>
    );
  }

  return (
    <div>
      <p>Welcome {session.user.name}!</p>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}
```

## API Routes

Authentication endpoints are automatically available at:

- `POST /api/auth/sign-in/email` - Email/password sign in
- `POST /api/auth/sign-up/email` - Email/password sign up
- `GET /api/auth/sign-in/google` - Google OAuth sign in
- `GET /api/auth/callback/google` - Google OAuth callback
- `POST /api/auth/sign-out` - Sign out
- `GET /api/auth/session` - Get current session

## Security Notes

- Never commit `.env.local` to version control
- Use strong, randomly generated secrets for `BETTER_AUTH_SECRET`
- In production, set `requireEmailVerification: true` and configure an email service
- Always use HTTPS in production
- Rotate OAuth secrets regularly

