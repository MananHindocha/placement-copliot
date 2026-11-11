import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import { AgentProvider } from "@/context/AgentProvider";
import { ExecutionTraceDrawer } from "@/components/agent/ExecutionTraceDrawer";
import IntegratedRobotNavigator from "@/components/agent/IntegratedRobotNavigator";

export const metadata: Metadata = {
  title: "Placement Co-pilot | Your AI-Powered Job Search Dashboard",
  description:
    "Placement Co-pilot helps students land their dream jobs with AI-powered resume tailoring, job discovery, application tracking, and interview preparation.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#0A0B0F]">
      <body className="h-full flex antialiased bg-[#0A0B0F] text-[#F8F8F9]">
        <AgentProvider>
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-[#0A0B0F]">
            <Topbar />
            <main className="flex-1 overflow-y-auto bg-[#0A0B0F] p-4 sm:p-6 space-y-5">
              <IntegratedRobotNavigator />
              {children}
            </main>
          </div>
          <ExecutionTraceDrawer />
        </AgentProvider>
      </body>
    </html>
  );
}
