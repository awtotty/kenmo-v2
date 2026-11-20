import { clerkMiddleware, createRouteMatcher, type ClerkMiddlewareAuth } from "@clerk/nextjs/server";
import { type NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher(["/api/cron"]);

// Clerk middleware is opt-in: keep every matched route protected except cron,
// which performs its own bearer-secret check in the handler.
export async function protectRoutes(auth: ClerkMiddlewareAuth, request: NextRequest) {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
}

export default clerkMiddleware(protectRoutes);

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)"
  ],
};
