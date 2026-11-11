/**
 * Supabase configuration and data-mode resolution helper.
 *
 * Ensures clean separation between demo mode (mock data) and live mode (Supabase persistence).
 */

export type DataMode = "demo" | "live";

export const DEMO_SESSION_COOKIE = "placement_demo_session";

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Support either standard publishable key or legacy anon key alias
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return {
    url: url?.trim() || "",
    publishableKey: publishableKey?.trim() || "",
  };
}

/**
 * Returns true only when valid non-placeholder Supabase credentials are configured.
 */
export function isSupabaseConfigured(): boolean {
  const { url, publishableKey } = getSupabaseEnv();
  if (!url || !publishableKey) return false;
  if (url.includes("your-project-id") || publishableKey.includes("your-supabase")) {
    return false;
  }
  return true;
}

/**
 * Determines current active data mode.
 * - If user explicitly selected demo mode via cookie/storage/env, return "demo".
 * - If Supabase credentials are unset or invalid, return "demo".
 * - Otherwise return "live".
 */
export function getEffectiveDataMode(): DataMode {
  if (!isSupabaseConfigured()) {
    return "demo";
  }

  const explicitMode = process.env.NEXT_PUBLIC_DATA_MODE;
  if (explicitMode === "demo") {
    return "demo";
  }

  return "live";
}

/**
 * Checks whether an explicit demo session cookie is active (only valid in demo-enabled mode).
 */
export function hasActiveDemoSession(cookieValue?: string | null): boolean {
  return getEffectiveDataMode() === "demo" && cookieValue === "1";
}

/**
 * Sets or clears the explicit browser-session demo marker cookie.
 * Scoped to the browser session (no Max-Age) so reopening a closed browser lands on Login first.
 */
export function setDemoSessionCookie(enabled: boolean): void {
  if (typeof document === "undefined") return;
  if (enabled) {
    document.cookie = `${DEMO_SESSION_COOKIE}=1; Path=/; SameSite=Lax`;
  } else {
    document.cookie = `${DEMO_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

/**
 * Client-side check for whether the explicit demo session cookie is currently set.
 */
export function hasClientDemoCookie(): boolean {
  if (typeof document === "undefined" || getEffectiveDataMode() !== "demo") {
    return false;
  }
  return document.cookie
    .split(";")
    .some((part) => part.trim() === `${DEMO_SESSION_COOKIE}=1`);
}

/**
 * Validates post-auth redirect targets to prevent open redirects and auth redirect loops.
 */
export function sanitizeRedirectPath(
  nextPath: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!nextPath || typeof nextPath !== "string") return fallback;
  const trimmed = nextPath.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }
  if (trimmed === "/" || trimmed.startsWith("/auth/login") || trimmed.startsWith("/auth/callback")) {
    return fallback;
  }
  return trimmed;
}
