import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DEMO_SESSION_COOKIE,
  hasActiveDemoSession,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

export default async function Home() {
  const cookieStore = await cookies();
  const isDemoActive = hasActiveDemoSession(
    cookieStore.get(DEMO_SESSION_COOKIE)?.value
  );

  if (isDemoActive) {
    redirect("/dashboard");
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        redirect("/dashboard");
      }
    } catch {
      // Fall through to login when session check cannot be completed
    }
  }

  redirect("/auth/login");
}
