/**
 * Supabase configuration and data-mode resolution helper.
 *
 * Ensures clean separation between demo mode (mock data) and live mode (Supabase persistence).
 */

export type DataMode = "demo" | "live";

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
