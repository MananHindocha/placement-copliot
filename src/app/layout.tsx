import type { Metadata } from "next";
import "./globals.css";
import { AgentProvider } from "@/context/AgentProvider";
import AppShell from "@/components/layout/AppShell";

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
    <html lang="en" className="h-full bg-[#000000]">
      <body className="h-dvh overflow-hidden antialiased bg-[#000000] text-[#F5F5F5]">
        <AgentProvider>
          <AppShell>{children}</AppShell>
        </AgentProvider>
      </body>
    </html>
  );
}
