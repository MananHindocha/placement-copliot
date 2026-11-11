import type { Metadata } from "next";
import "./globals.css";
import { AgentProvider } from "@/context/AgentProvider";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "Placement Co-pilot | Your AI-Powered Job Search Dashboard",
  description:
    "Autonomous career co-pilot matching real student skills to verified roles with proactive Glass-Box agentic orchestration.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full bg-[#000000]">
      <body className="h-dvh overflow-hidden antialiased bg-[#000000] text-[#F5F5F5]">
        <AgentProvider>
          <AppShell>{children}</AppShell>
        </AgentProvider>
      </body>
    </html>
  );
}
