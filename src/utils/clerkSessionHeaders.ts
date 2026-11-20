import { type useClerk } from "@clerk/nextjs";

type SessionTokenSource = { getToken: () => Promise<string | null> };

export function browserClerkSessionHeaders() {
  if (typeof window === "undefined") return clerkSessionHeaders(null);
  // ClerkJS exposes its loaded client on window; Clerk 7 does not declare that
  // browser global in its Next.js types. Keep the boundary typed to its SDK.
  const browser = window as Window & { Clerk?: ReturnType<typeof useClerk> };
  return clerkSessionHeaders(browser.Clerk?.session);
}

// Resolve the active session for every batch, rather than capturing an old token
// when the tRPC client is created. Clerk remains responsible for verification.
export async function clerkSessionHeaders(session?: SessionTokenSource | null): Promise<Record<string, string>> {
  const token = await session?.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
