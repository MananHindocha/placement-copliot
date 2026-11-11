"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter, useSelectedLayoutSegment } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import WorkspaceMain from "@/components/layout/WorkspaceMain";
import { ExecutionTraceDrawer } from "@/components/agent/ExecutionTraceDrawer";
import { PrepDrawerProvider, usePrepDrawer } from "@/context/PrepDrawerContext";
import { createClient } from "@/lib/supabase/client";
import {
  hasClientDemoCookie,
  isSupabaseConfigured,
  sanitizeRedirectPath,
} from "@/lib/supabase/config";

function ShellFrame({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const pathname = usePathname();
  const router = useRouter();
  const isHomeRoute = segment === "dashboard";
  const { openDrawer, prepSummary } = usePrepDrawer();

  useEffect(() => {
    if (!pathname || pathname === "/" || pathname.startsWith("/auth")) {
      return;
    }

    let cancelled = false;
    const redirectToLogin = () => {
      if (cancelled) return;
      const intended =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : pathname;
      const safeNext = sanitizeRedirectPath(intended, "/dashboard");
      router.replace(`/auth/login?next=${encodeURIComponent(safeNext)}`);
    };

    const verifyClientSession = async () => {
      if (hasClientDemoCookie()) {
        return;
      }
      if (!isSupabaseConfigured()) {
        redirectToLogin();
        return;
      }
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!cancelled && !user && !hasClientDemoCookie()) {
          redirectToLogin();
        }
      } catch {
        // Defer to server proxy boundary on transient client network failure
      }
    };

    void verifyClientSession();

    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void verifyClientSession();
      }
    };
    window.addEventListener("pageshow", handlePageShow);

    let unsubscribe: (() => void) | undefined;
    if (isSupabaseConfigured()) {
      const supabase = createClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event: string) => {
        if (event === "SIGNED_OUT" && !hasClientDemoCookie()) {
          redirectToLogin();
          router.refresh();
        }
      });
      unsubscribe = () => subscription.unsubscribe();
    }

    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", handlePageShow);
      unsubscribe?.();
    };
  }, [pathname, router]);

  return (
    <div className="h-dvh w-full flex overflow-hidden bg-[#000000] text-[#F5F5F5] resume-print-ancestor">
      {/* Left Navigation Sidebar (fixed full viewport height) */}
      <Sidebar />

      {/* Workspace Area */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden bg-[#000000] resume-print-ancestor">
        <Topbar
          onOpenPrepDrawer={isHomeRoute ? openDrawer : undefined}
          prepSummary={isHomeRoute ? prepSummary : undefined}
        />

        {isHomeRoute ? (
          <div className="flex-1 min-w-0 min-h-0 flex overflow-hidden resume-print-ancestor">
            {children}
          </div>
        ) : (
          <WorkspaceMain>{children}</WorkspaceMain>
        )}
      </div>

      <ExecutionTraceDrawer />
    </div>
  );
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <PrepDrawerProvider>
      <ShellFrame>{children}</ShellFrame>
    </PrepDrawerProvider>
  );
}
