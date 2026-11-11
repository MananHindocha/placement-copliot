"use client";

import type { ReactNode } from "react";
import WorkspaceMain from "@/components/layout/WorkspaceMain";
import PreparationSidebar from "@/components/preparation/PreparationSidebar";
import { usePrepDrawer } from "@/context/PrepDrawerContext";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { mobileOpen, closeDrawer, setPrepSummary } = usePrepDrawer();

  return (
    <div className="flex-1 min-w-0 min-h-0 flex overflow-hidden resume-print-ancestor">
      {/* Home Center Column (independently scrollable) */}
      <WorkspaceMain>{children}</WorkspaceMain>

      {/* Home-Exclusive Fixed Right Sidebar: Preparation Calendar & Progress */}
      <PreparationSidebar
        mobileOpen={mobileOpen}
        onCloseMobile={closeDrawer}
        onProgressSummaryChange={setPrepSummary}
      />
    </div>
  );
}
