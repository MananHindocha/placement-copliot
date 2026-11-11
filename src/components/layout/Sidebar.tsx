"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  KanbanSquare,
  MessageSquare,
  Target,
  Zap,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Bot,
} from "lucide-react";
import { clsx } from "clsx";
import { useState, useEffect } from "react";
import { getUserProfile, type UserProfile } from "@/lib/services/auth.service";

const NAV_ITEMS = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "My Resume", href: "/resume", icon: FileText },
  { label: "Find Jobs", href: "/jobs", icon: Briefcase },
  { label: "My Applications", href: "/tracker", icon: KanbanSquare },
  { label: "Practice Interviews", href: "/interview", icon: MessageSquare },
  { label: "Study Plan", href: "/readiness", icon: Target },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const p = await getUserProfile();
        setProfile(p);
      } catch {
        // Fallback
      }
    }
    load();
  }, [pathname]);

  const initials = profile?.fullName
    ? profile.fullName
        .split(" ")
        .filter((part) => part.trim().length > 0)
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "ST";

  return (
    <aside
      className={clsx(
        "relative flex flex-col bg-[#111218] border-r border-[#22232D] transition-all duration-200 ease-out shrink-0",
        collapsed ? "w-[60px] sm:w-[68px]" : "w-[60px] sm:w-[236px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 sm:px-4 py-4 border-b border-[#22232D] justify-center sm:justify-start">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#171820] border border-[#2B2C38] shrink-0">
          <GraduationCap className="w-4 h-4 text-[#B293E2]" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden hidden sm:block">
            <p className="text-[#F8F8F9] font-semibold text-sm leading-tight truncate">
              Placement
            </p>
            <p className="text-[#B293E2] font-medium text-xs leading-tight truncate mt-0.5">
              Co-pilot
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 sm:px-2.5 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              title={collapsed ? item.label : undefined}
              className={clsx(
                "flex items-center gap-3 px-2.5 sm:px-3 py-2.5 rounded-lg transition-colors duration-150 group border justify-center sm:justify-start",
                active
                  ? "bg-[#171820] text-[#F8F8F9] border-[#2C2D3A] font-medium"
                  : "border-transparent text-[#969085] hover:text-[#F8F8F9] hover:bg-[#171820]/60 hover:border-[#22232D]"
              )}
            >
              <Icon
                className={clsx(
                  "w-4 h-4 shrink-0 transition-colors",
                  active ? "text-[#B293E2]" : "text-[#969085] group-hover:text-[#F8F8F9]"
                )}
              />
              {!collapsed && (
                <span className="text-[13px] font-medium truncate hidden sm:inline">{item.label}</span>
              )}
              {active && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#B293E2] hidden sm:block" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User badge */}
      <div className={clsx("px-2 sm:px-3 py-3.5 border-t border-[#22232D]", collapsed && "px-2")}>
        <div className={clsx("flex items-center gap-3 justify-center sm:justify-start", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-lg bg-[#1D1D26] border border-[#2D2E3B] flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-[#B293E2]">{initials}</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden hidden sm:block">
              <p className="text-[13px] font-medium text-[#F8F8F9] truncate">{profile?.fullName || "Student Account"}</p>
              <p className="text-[11px] text-[#969085] truncate">
                {profile?.branch && profile?.college
                  ? `${profile.branch.split(" ")[0]} @ ${profile.college}`
                  : profile?.email || "Placement Candidate"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="hidden sm:flex absolute -right-3 top-14 z-10 items-center justify-center w-6 h-6 rounded-full bg-[#171820] border border-[#2A2B37] text-[#969085] hover:text-[#F8F8F9] hover:border-[#735BA0] hover:bg-[#1D1D26] transition-colors cursor-pointer"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Powered by badge */}
      {!collapsed && (
        <div className="px-3 pb-3.5 hidden sm:block">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#171820] border border-[#22232D]">
            <Zap className="w-3.5 h-3.5 text-[#B293E2] shrink-0" />
            <span className="text-[11px] text-[#969085] truncate">Powered by Gemini AI</span>
          </div>
        </div>
      )}
    </aside>
  );
}
