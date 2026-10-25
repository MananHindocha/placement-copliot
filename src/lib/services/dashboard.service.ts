import { createClient } from "@/lib/supabase/client";
import { getEffectiveDataMode } from "@/lib/supabase/config";
import { STATS, ACTIVITIES, READINESS_DOMAINS } from "@/lib/mock-data";
import type { StatCard, Activity, ReadinessDomain } from "@/types";

export interface DashboardOverview {
  stats: StatCard[];
  activities: Activity[];
  readinessDomains: ReadinessDomain[];
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    return {
      stats: [...STATS],
      activities: [...ACTIVITIES],
      readinessDomains: [...READINESS_DOMAINS],
    };
  }

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(
      authError?.message || "Authentication required: please sign in to view your dashboard overview."
    );
  }

  // Count live stats from Supabase
  const [appsRes, interviewsRes, resumeRes, tasksRes, completedTasksRes] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status", { count: "exact" })
      .eq("user_id", user.id),
    supabase
      .from("interview_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("resume_analyses")
      .select("match_score, ats_score")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("readiness_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("readiness_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("completed", true),
  ]);

  if (appsRes.error) throw new Error(`Failed to query applications: ${appsRes.error.message}`);
  if (interviewsRes.error) throw new Error(`Failed to query interviews: ${interviewsRes.error.message}`);
  if (resumeRes.error) throw new Error(`Failed to query resume analyses: ${resumeRes.error.message}`);
  if (tasksRes.error) throw new Error(`Failed to query readiness tasks: ${tasksRes.error.message}`);
  if (completedTasksRes.error) throw new Error(`Failed to query completed tasks: ${completedTasksRes.error.message}`);

  const totalApps = appsRes.count ?? 0;
  const totalInterviews = interviewsRes.count ?? 0;
  const latestResume = resumeRes.data?.[0];
  const resumeMatchScore = latestResume ? `${latestResume.match_score}%` : "N/A";
  
  const totalTasks = tasksRes.count ?? 0;
  const completedTasks = completedTasksRes.count ?? 0;
  const readinessPercent = totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : "0%";

  const dynamicStats: StatCard[] = [
    {
      label: "Applications Sent",
      value: totalApps,
      delta: `${totalApps} active`,
      deltaPositive: true,
      icon: "Send",
      color: "indigo",
    },
    {
      label: "Interviews Recorded",
      value: totalInterviews,
      delta: `${totalInterviews} sessions`,
      deltaPositive: true,
      icon: "CalendarCheck",
      color: "emerald",
    },
    {
      label: "Resume Match Score",
      value: resumeMatchScore,
      delta: latestResume ? "Latest scan" : "Pending upload",
      deltaPositive: !!latestResume,
      icon: "FileText",
      color: "violet",
    },
    {
      label: "Readiness Score",
      value: readinessPercent,
      delta: `${completedTasks}/${totalTasks} tasks`,
      deltaPositive: true,
      icon: "TrendingUp",
      color: "amber",
    },
  ];

  return {
    stats: dynamicStats,
    activities: [],
    readinessDomains: [],
  };
}
