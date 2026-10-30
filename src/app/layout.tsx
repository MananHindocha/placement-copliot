import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export const metadata: Metadata = {
  title: "Placement Co-pilot | Your AI-Powered Job Search Dashboard",
  description:
    "Placement Co-pilot helps students land their dream jobs with AI-powered resume tailoring, job discovery, application tracking, and mock interviews.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full flex antialiased">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto bg-[#060d1a] p-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
