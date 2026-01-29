export { GitHubGraphQLClient, GitHubAuthenticationError, GitHubAPIError } from './GitHubGraphQLClient';
export type { GitHubClient } from './GitHubClient';

// Authentication exports
export { auth } from './auth';
export type { Session } from './auth';
export { authClient, signIn, signUp, signOut, useSession } from './auth-client';
export { getSession, requireAuth, getCurrentUser } from './auth-session';
