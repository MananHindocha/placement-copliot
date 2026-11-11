"use client";

import type { ReactNode } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import WorkspaceMain from "@/components/layout/WorkspaceMain";
import { ExecutionTraceDrawer } from "@/components/agent/ExecutionTraceDrawer";
import { PrepDrawerProvider, usePrepDrawer } from "@/context/PrepDrawerContext";

function ShellFrame({ children }: { children: ReactNode }) {
  const segment = useSelectedLayoutSegment();
  const isHomeRoute = segment === "dashboard";
  const { openDrawer, prepSummary } = usePrepDrawer();

  return (
    <div className="h-dvh w-full flex overflow-hidden bg-[#0A0B0F] text-[#F8F8F9] resume-print-ancestor">
      {/* Left Navigation Sidebar (fixed full viewport height) */}
      <Sidebar />

      {/* Workspace Area */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden bg-[#0A0B0F] resume-print-ancestor">
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
