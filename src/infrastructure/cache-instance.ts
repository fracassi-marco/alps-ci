import { InMemoryGitHubDataCache } from './GitHubDataCache';

/**
 * Singleton instance of the GitHub data cache
 * This ensures cache is shared across all API requests
 */
let cacheInstance: InMemoryGitHubDataCache | null = null;

export function getGitHubDataCache(): InMemoryGitHubDataCache {
  if (!cacheInstance) {
    cacheInstance = new InMemoryGitHubDataCache();
    console.log('[Cache] Created new singleton cache instance');
  }
  return cacheInstance;
}

/**
 * Clears the singleton cache instance (useful for testing)
 */
export function clearGitHubDataCache(): void {
  if (cacheInstance) {
    cacheInstance.invalidateAll();
    cacheInstance = null;
    console.log('[Cache] Cleared singleton cache instance');
  }
}

