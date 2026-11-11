"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, ArrowRight, ShieldCheck, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { signInWithEmail, signUpWithEmail } from "@/lib/services/auth.service";
import {
  isSupabaseConfigured,
  getEffectiveDataMode,
  sanitizeRedirectPath,
  setDemoSessionCookie,
} from "@/lib/supabase/config";
import Button from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const isDemo = getEffectiveDataMode() === "demo";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const getPostAuthDestination = () => {
    const nextParam =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("next")
        : null;
    return sanitizeRedirectPath(nextParam, "/dashboard");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!configured) {
      setErrorMsg(
        "Supabase credentials are not configured. You can use 'Continue in Demo Mode' below to explore all features."
      );
      return;
    }

    setLoading(true);
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password);
        setDemoSessionCookie(false);
        router.push(getPostAuthDestination());
        router.refresh();
      } else {
        await signUpWithEmail(email, password, fullName);
        setSuccessMsg("Account created! Check your email for confirmation or sign in directly.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#0D0D0D] border border-[#1D1D1D] mb-3">
            <GraduationCap className="w-6 h-6 text-[#A78BFA]" />
          </div>
          <h1 className="text-2xl font-bold text-[#F5F5F5] tracking-tight">Placement Co-pilot</h1>
          <p className="text-sm text-[#A1A1AA] mt-1">
            Sign in to access your persistent job search dashboard
          </p>

          {/* Config status badge */}
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border bg-[#0D0D0D] border-[#1D1D1D] text-[#A1A1AA]">
            {configured ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Supabase Live Auth Active</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Demo Mode Available (Supabase Unconfigured)</span>
              </>
            )}
          </div>
        </div>

        {/* Auth Card */}
        <div className="rounded-2xl bg-[#0D0D0D] border border-[#1D1D1D] p-6 sm:p-8">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-[#050505] border border-[#1D1D1D] mb-6 text-sm">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                mode === "signin"
                  ? "bg-[#121212] text-[#F5F5F5] border border-[#292929]"
                  : "text-[#71717A] hover:text-[#F5F5F5]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                mode === "signup"
                  ? "bg-[#121212] text-[#F5F5F5] border border-[#292929]"
                  : "text-[#71717A] hover:text-[#F5F5F5]"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Notification Messages */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/8 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/8 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <div className="flex-1">{successMsg}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-[#F5F5F5] mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Arjun Kumar"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#080808] border border-[#1D1D1D] rounded-xl text-[#F5F5F5] placeholder-[#52525B] focus:outline-none focus:border-[#292929] transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#F5F5F5] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                className="w-full px-3.5 py-2.5 text-sm bg-[#080808] border border-[#1D1D1D] rounded-xl text-[#F5F5F5] placeholder-[#52525B] focus:outline-none focus:border-[#292929] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#F5F5F5] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-sm bg-[#080808] border border-[#1D1D1D] rounded-xl text-[#F5F5F5] placeholder-[#52525B] focus:outline-none focus:border-[#292929] transition-colors"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full justify-center py-2.5 text-sm font-semibold"
            >
              {loading
                ? "Processing..."
                : mode === "signin"
                ? "Sign In to Dashboard"
                : "Register Account"}
            </Button>
          </form>

          {isDemo && (
            <>
              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#171717]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#0D0D0D] px-3 text-[#71717A]">Or explore without an account</span>
                </div>
              </div>

              {/* Demo Mode Button */}
              <Link
                href="/dashboard"
                prefetch={false}
                onClick={(e) => {
                  e.preventDefault();
                  setDemoSessionCookie(true);
                  router.push(getPostAuthDestination());
                  router.refresh();
                }}
                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#0A0A0A] border border-[#1D1D1D] hover:bg-[#121212] hover:border-[#292929] text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors text-sm font-medium group"
              >
                <Sparkles className="w-4 h-4 text-[#A78BFA]" />
                <span>Continue in Demo Mode</span>
                <ArrowRight className="w-4 h-4 text-[#71717A] group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </>
          )}

          <p className="mt-4 text-center text-xs text-[#71717A] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Secure Supabase RLS ownership isolation</span>
          </p>
        </div>
      </div>
    </div>
  );
}
