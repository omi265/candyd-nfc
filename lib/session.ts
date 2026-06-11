import { cache } from "react";
import { auth } from "@/auth";

/**
 * Cached version of auth() — deduplicates calls within a single server render request.
 * React's cache() ensures this only executes once per request, even if called multiple times
 * across different server actions and page components.
 *
 * Use this everywhere instead of calling auth() directly in pages & actions.
 */
export const getSession = cache(async () => {
  return await auth();
});

/**
 * Convenience helper to get just the user ID.
 * Returns null if unauthenticated.
 */
export const getUserId = cache(async (): Promise<string | null> => {
  const session = await getSession();
  return session?.user?.id ?? null;
});
