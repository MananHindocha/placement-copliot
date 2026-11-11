import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import {
  DEMO_SESSION_COOKIE,
  hasActiveDemoSession,
  isSupabaseConfigured,
  sanitizeRedirectPath,
} from "@/lib/supabase/config";

const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/resume",
  "/jobs",
  "/tracker",
  "/interview",
  "/readiness",
];

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function redirectWithCookies(
  request: NextRequest,
  sessionResponse: NextResponse,
  targetPathname: string,
  nextTarget?: string
): NextResponse {
  const url = request.nextUrl.clone();
  const qIdx = targetPathname.indexOf("?");
  url.pathname = qIdx === -1 ? targetPathname || "/" : targetPathname.slice(0, qIdx) || "/";
  url.search = qIdx === -1 ? "" : targetPathname.slice(qIdx);
  if (nextTarget) {
    url.searchParams.set("next", nextTarget);
  }

  const redirectResponse = NextResponse.redirect(url);
  redirectResponse.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  redirectResponse.headers.set("Pragma", "no-cache");
  redirectResponse.headers.set("Expires", "0");
  sessionResponse.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

/**
 * Next.js 16 proxy convention with exported proxy function.
 * Enforces Login-first entry flow while supporting Supabase auth sessions and Demo Mode.
 * (Note: Server operations and RLS remain the true security boundaries).
 */
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);

  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/")) {
    return response;
  }

  const isAuthenticated = isSupabaseConfigured() && Boolean(user);
  const isDemoActive = hasActiveDemoSession(
    request.cookies.get(DEMO_SESSION_COOKIE)?.value
  );

  // If already authenticated with Supabase and visiting the login page, redirect to intended target or dashboard
  if (pathname.startsWith("/auth/login")) {
    if (isAuthenticated) {
      const target = sanitizeRedirectPath(
        request.nextUrl.searchParams.get("next"),
        "/dashboard"
      );
      return redirectWithCookies(request, response, target);
    }
    return response;
  }

  if (pathname.startsWith("/auth/callback")) {
    return response;
  }

  // Root entry URL: send unauthenticated visitors to Login first; returning users go to Dashboard
  if (pathname === "/") {
    if (isAuthenticated || isDemoActive) {
      return redirectWithCookies(request, response, "/dashboard");
    }
    return redirectWithCookies(request, response, "/auth/login");
  }

  // Protect Dashboard and all application workspaces
  if (isProtectedRoute(pathname) && !isAuthenticated && !isDemoActive) {
    const intendedPath = `${pathname}${request.nextUrl.search}`;
    const safeNext = sanitizeRedirectPath(intendedPath, "/dashboard");
    return redirectWithCookies(request, response, "/auth/login", safeNext);
  }

  return response;
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
