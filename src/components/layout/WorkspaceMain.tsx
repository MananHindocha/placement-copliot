"use client";

import type { ReactNode } from "react";
import IntegratedRobotNavigator from "@/components/agent/IntegratedRobotNavigator";

export default function WorkspaceMain({ children }: { children: ReactNode }) {
  return (
    <main className="flex-1 min-w-0 min-h-0 overflow-y-auto overflow-x-hidden bg-[#0A0B0F] p-4 sm:p-6 space-y-5 @container/main resume-print-ancestor">
      <IntegratedRobotNavigator />
      {children}
    </main>
  );
}

