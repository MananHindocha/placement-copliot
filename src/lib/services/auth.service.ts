import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, getEffectiveDataMode } from "@/lib/supabase/config";
import type { User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  college?: string;
  branch?: string;
  graduationYear?: number;
  cgpa?: number;
}

export const DEMO_USER_PROFILE: UserProfile = {
  id: "demo-user-1",
  fullName: "Arjun Kumar",
  email: "arjun.kumar@nitt.edu",
  avatarUrl: undefined,
  college: "NIT Trichy",
  branch: "Computer Science & Engineering",
  graduationYear: 2026,
  cgpa: 8.85,
};

export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserProfile(): Promise<UserProfile> {
  const mode = getEffectiveDataMode();

  if (mode === "demo" || !isSupabaseConfigured()) {
    return DEMO_USER_PROFILE;
  }

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      id: "unauthenticated",
      fullName: "Guest Student",
      email: "",
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    // If trigger did not run or record doesn't exist yet, return minimal profile from user metadata
    return {
      id: user.id,
      fullName: user.user_metadata?.full_name || user.email?.split("@")[0] || "Student",
      email: user.email || "",
    };
  }

  return {
    id: profile.id,
    fullName: profile.full_name || "Student",
    email: profile.email || user.email || "",
    avatarUrl: profile.avatar_url,
    college: profile.college,
    branch: profile.branch,
    graduationYear: profile.graduation_year,
    cgpa: profile.cgpa,
  };
}

export async function signInWithEmail(email: string, password: string) {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase credentials are not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your environment."
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string
) {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase credentials are not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to your environment."
    );
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signOutUser() {
  if (!isSupabaseConfigured()) {
    return;
  }

  const supabase = createClient();
  await supabase.auth.signOut();
}
