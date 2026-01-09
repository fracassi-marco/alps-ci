import { headers } from "next/headers";
import { auth } from "./auth";
import { cache } from "react";

/**
 * Get the current session from the request headers
 * This is a cached function that can be called multiple times in a single request
 */
export const getSession = cache(async () => {
  return await auth.api.getSession({
    headers: await headers(),
  });
});

/**
 * Require authentication, throw if not authenticated
 */
export async function requireAuth() {
  const session = await getSession();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  return session;
}

/**
 * Get the current user from session
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}

