import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv, isSupabaseConfigured } from "./config";

let browserClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Creates or retrieves the singleton Supabase browser client.
 * Safe for execution in unconfigured environments (returns safe fallback dummy).
 */
export function createClient() {
  const { url, publishableKey } = getSupabaseEnv();

  if (!isSupabaseConfigured()) {
    return createBrowserClient(
      url || "https://placeholder-project.supabase.co",
      publishableKey || "placeholder-anon-key"
    );
  }

  if (!browserClient) {
    browserClient = createBrowserClient(url, publishableKey);
  }

  return browserClient;
}
