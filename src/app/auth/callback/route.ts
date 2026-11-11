import { createClient } from "@/lib/supabase/server";
import { DEMO_SESSION_COOKIE, sanitizeRedirectPath } from "@/lib/supabase/config";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = sanitizeRedirectPath(searchParams.get("next"), "/dashboard");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`);
      response.cookies.set(DEMO_SESSION_COOKIE, "", {
        path: "/",
        maxAge: 0,
        sameSite: "lax",
      });
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=Unable+to+verify+credentials`);
}
