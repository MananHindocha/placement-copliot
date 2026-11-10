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
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Resume Screener", href: "/resume", icon: FileText },
  { label: "Job Discovery", href: "/jobs", icon: Briefcase },
  { label: "App Tracker", href: "/tracker", icon: KanbanSquare },
  { label: "Practice Interviews", href: "/interview", icon: MessageSquare },
  { label: "Readiness Plan", href: "/readiness", icon: Target },
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
        "relative flex flex-col bg-[#080A14] border-r border-[rgba(100,110,255,0.12)] transition-all duration-300 ease-in-out shrink-0",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[rgba(100,110,255,0.12)]">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1B1FB8] shadow-md shadow-[rgba(27,31,184,0.4)] shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-[#F5F6FF] font-semibold text-sm leading-tight truncate">
              Placement
            </p>
            <p className="text-[#777CFF] font-semibold text-sm leading-tight truncate">
              Co-pilot
            </p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-2 space-y-1">
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
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group border",
                active
                  ? "bg-[rgba(27,31,184,0.22)] text-[#A5A9FF] border-[rgba(69,75,255,0.4)] shadow-sm shadow-[rgba(27,31,184,0.15)] font-medium"
                  : "border-transparent text-[#A2A7C0] hover:text-[#F5F6FF] hover:bg-[#151A35]/60 hover:border-[rgba(100,110,255,0.16)]"
              )}
            >
              <Icon
                className={clsx(
                  "w-5 h-5 shrink-0 transition-colors",
                  active ? "text-[#777CFF]" : "text-[#737A99] group-hover:text-[#A2A7C0]"
                )}
              />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
              {active && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#454BFF] shadow-sm shadow-[#454BFF]" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User badge */}
      <div className={clsx("px-3 py-4 border-t border-[rgba(100,110,255,0.12)]", collapsed && "px-2")}>
        <div className={clsx("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1B1FB8] to-[#454BFF] flex items-center justify-center shrink-0 shadow-inner">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-[#F5F6FF] truncate">{profile?.fullName || "Student Account"}</p>
              <p className="text-xs text-[#737A99] truncate">
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
        className="absolute -right-3 top-16 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-[#080A14] border border-[rgba(100,110,255,0.20)] text-[#A2A7C0] hover:text-[#F5F6FF] hover:border-[rgba(69,75,255,0.65)] hover:bg-[#101326] transition-all"
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
        <div className="px-4 pb-4">
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#101326]/60 border border-[rgba(100,110,255,0.12)]">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-[#737A99]">Powered by Gemini AI</span>
          </div>
        </div>
      )}
    </aside>
  );
}
