export { GitHubGraphQLClient, GitHubAuthenticationError, GitHubAPIError } from './GitHubGraphQLClient';
export { InMemoryGitHubDataCache } from './GitHubDataCache';
export type { GitHubDataCache, CachedData } from './GitHubDataCache';
export { CachedGitHubClient } from './CachedGitHubClient';
export { FileSystemBuildRepository } from './FileSystemBuildRepository';
export type { BuildRepository } from './FileSystemBuildRepository';

// Authentication exports
export { auth } from './auth';
export type { Session, User } from './auth';
export { authClient, signIn, signUp, signOut, useSession } from './auth-client';
export { getSession, requireAuth, getCurrentUser } from './auth-session';
