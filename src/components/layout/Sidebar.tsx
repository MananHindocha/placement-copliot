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
        "relative flex flex-col bg-[#050505] border-r border-[#1D1D1D] transition-all duration-200 ease-out shrink-0",
        collapsed ? "w-[60px] sm:w-[68px]" : "w-[60px] sm:w-[236px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-3 sm:px-4 py-4 border-b border-[#1D1D1D] justify-center sm:justify-start">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#0D0D0D] border border-[#1D1D1D] shrink-0">
          <GraduationCap className="w-4 h-4 text-[#A78BFA]" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden hidden sm:block">
            <p className="text-[#F5F5F5] font-semibold text-sm leading-tight truncate">
              Placement
            </p>
            <p className="text-[#A78BFA] font-medium text-xs leading-tight truncate mt-0.5">
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
                  ? "bg-[#121212] text-[#F5F5F5] border-[#292929] font-medium"
                  : "border-transparent text-[#A1A1AA] hover:text-[#F5F5F5] hover:bg-[#0D0D0D] hover:border-[#1D1D1D]"
              )}
            >
              <Icon
                className={clsx(
                  "w-4 h-4 shrink-0 transition-colors",
                  active ? "text-[#A78BFA]" : "text-[#71717A] group-hover:text-[#F5F5F5]"
                )}
              />
              {!collapsed && (
                <span className="text-[13px] font-medium truncate hidden sm:inline">{item.label}</span>
              )}
              {active && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#A78BFA] hidden sm:block" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User badge */}
      <div className={clsx("px-2 sm:px-3 py-3.5 border-t border-[#1D1D1D]", collapsed && "px-2")}>
        <div className={clsx("flex items-center gap-3 justify-center sm:justify-start", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-lg bg-[#121212] border border-[#292929] flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-[#F5F5F5]">{initials}</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden hidden sm:block">
              <p className="text-[13px] font-medium text-[#F5F5F5] truncate">{profile?.fullName || "Student Account"}</p>
              <p className="text-[11px] text-[#71717A] truncate">
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
        className="hidden sm:flex absolute -right-3 top-14 z-10 items-center justify-center w-6 h-6 rounded-full bg-[#0D0D0D] border border-[#292929] text-[#A1A1AA] hover:text-[#F5F5F5] hover:border-[#3F3F46] hover:bg-[#121212] transition-colors cursor-pointer"
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
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0D0D0D] border border-[#1D1D1D]">
            <Zap className="w-3.5 h-3.5 text-[#A78BFA] shrink-0" />
            <span className="text-[11px] text-[#71717A] truncate">Powered by Gemini AI</span>
          </div>
        </div>
      )}
    </aside>
  );
}
