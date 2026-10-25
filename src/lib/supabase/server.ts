import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv, isSupabaseConfigured } from "./config";

/**
 * Creates a Supabase server client for Server Components, Server Actions, and Route Handlers.
 * In Next.js 16, cookies() is asynchronous and properly awaited.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, publishableKey } = getSupabaseEnv();

  const safeUrl = isSupabaseConfigured() ? url : "https://placeholder-project.supabase.co";
  const safeKey = isSupabaseConfigured() ? publishableKey : "placeholder-anon-key";

  return createServerClient(safeUrl, safeKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was invoked from a Server Component.
          // This is expected and safe to ignore when session refresh proxy handles cookies.
        }
      },
    },
  });
}
