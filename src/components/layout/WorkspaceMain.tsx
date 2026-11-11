"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import IntegratedRobotNavigator from "@/components/agent/IntegratedRobotNavigator";

const AGENT_BANNER_ROUTES = ["/dashboard", "/resume"];

function shouldRenderAgentBanner(pathname: string | null): boolean {
  if (!pathname) return false;
  return AGENT_BANNER_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

export default function WorkspaceMain({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showAgentBanner = shouldRenderAgentBanner(pathname);

  return (
    <main className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden bg-[#000000] p-4 sm:p-6 space-y-5 @container/main resume-print-ancestor">
      {showAgentBanner && <IntegratedRobotNavigator />}
      {children}
    </main>
  );
}

