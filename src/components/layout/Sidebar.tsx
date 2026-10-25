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
} from "lucide-react";
import { clsx } from "clsx";
import { useState, useEffect } from "react";
import { getUserProfile, type UserProfile } from "@/lib/services/auth.service";

const NAV_ITEMS = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Resume Screener", href: "/resume", icon: FileText },
  { label: "Job Discovery", href: "/jobs", icon: Briefcase },
  { label: "App Tracker", href: "/tracker", icon: KanbanSquare },
  { label: "Mock Interviews", href: "/interview", icon: MessageSquare },
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
        "relative flex flex-col bg-[#0F172A] border-r border-white/5 transition-all duration-300 ease-in-out shrink-0",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-500 shrink-0">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-white font-semibold text-sm leading-tight truncate">
              Placement
            </p>
            <p className="text-indigo-400 font-semibold text-sm leading-tight truncate">
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
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group",
                active
                  ? "bg-indigo-500/20 text-indigo-300"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon
                className={clsx(
                  "w-5 h-5 shrink-0 transition-colors",
                  active ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
              {active && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User badge */}
      <div className={clsx("px-3 py-4 border-t border-white/5", collapsed && "px-2")}>
        <div className={clsx("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-white truncate">{profile?.fullName || "Student Account"}</p>
              <p className="text-xs text-slate-500 truncate">
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
        className="absolute -right-3 top-16 z-10 flex items-center justify-center w-6 h-6 rounded-full bg-[#0F172A] border border-white/10 text-slate-400 hover:text-white hover:border-indigo-500/50 transition-all"
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
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/3">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-slate-500">Powered by Gemini AI</span>
          </div>
        </div>
      )}
    </aside>
  );
}
