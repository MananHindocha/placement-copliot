import { createClient } from "@/lib/supabase/client";
import { getEffectiveDataMode } from "@/lib/supabase/config";
import { READINESS_DOMAINS } from "@/lib/mock-data";
import {
  getStoredApplications,
  getStoredResumeWorkspace,
  getStoredReadinessMilestones,
  getStoredInterviewSessions,
  getStoredActivities,
} from "@/lib/storage-sync";
import type { StatCard, Activity, ReadinessDomain } from "@/types";

export interface UpcomingInterviewItem {
  id: string;
  company: string;
  role: string;
  type: string;
  date: string;
  time?: string;
  logo: string;
  url?: string;
}

export interface DashboardOverview {
  stats: StatCard[];
  activities: Activity[];
  readinessDomains: ReadinessDomain[];
  upcomingInterviews: UpcomingInterviewItem[];
}

export async function getDashboardOverview(): Promise<DashboardOverview> {
  const mode = getEffectiveDataMode();

  if (mode === "demo") {
    // 1. Applications Data
    const cards = getStoredApplications();
    const totalApps = cards.length;
    const appliedCount = cards.filter((c) => c.status === "Applied").length;
    const interviewStageCount = cards.filter((c) => ["Phone Screen", "Interview"].includes(c.status)).length;
    const offerCount = cards.filter((c) => c.status === "Offer").length;
    const scheduledInterviews = cards.filter((c) => ["Phone Screen", "Interview"].includes(c.status) || !!c.nextStepDate);

    // 2. Latest Resume Data
    const storedWorkspace = getStoredResumeWorkspace();
    const latestAnalysis = storedWorkspace?.analysis;
    const matchScore = latestAnalysis ? latestAnalysis.matchScore : 82;
    const atsScore = latestAnalysis ? latestAnalysis.atsScore : 78;

    // 3. Readiness Milestones Data
    const milestones = getStoredReadinessMilestones();
    const completedTasks = milestones.filter((m) => m.completed).length;
    const totalTasks = milestones.length;
    const taskRatio = totalTasks > 0 ? completedTasks / totalTasks : 0.7;

    // 4. Mock Interview Data
    const interviewSessions = getStoredInterviewSessions();
    const avgInterviewScore =
      interviewSessions.length > 0
        ? Math.round(interviewSessions.reduce((s, i) => s + i.score, 0) / interviewSessions.length)
        : 75;

    // 5. Compute Weighted Composite Readiness Score (40% Tasks, 30% Resume, 20% Interview, 10% Pipeline)
    const taskPart = taskRatio * 100 * 0.4;
    const resumePart = ((matchScore + atsScore) / 2) * 0.3;
    const interviewPart = avgInterviewScore * 0.2;
    const pipelineProgress = Math.min(100, Math.round(((appliedCount * 1 + interviewStageCount * 2 + offerCount * 4) / Math.max(1, totalApps)) * 25));
    const pipelinePart = pipelineProgress * 0.1;
    const compositeReadiness = Math.min(100, Math.max(10, Math.round(taskPart + resumePart + interviewPart + pipelinePart)));

    // 6. Compute Domain Breakdown
    const domainCategories: Record<string, string[]> = {
      Resume: ["resume"],
      Skills: ["skills"],
      Networking: ["network", "networking"],
      Interviews: ["interview", "interviews"],
      Applications: ["applications", "application"],
    };

    const readinessDomains = READINESS_DOMAINS.map((domain) => {
      const cats = domainCategories[domain.label] || [domain.label.toLowerCase()];
      const inCat = milestones.filter((m) => cats.includes(m.category.toLowerCase()));
      const completedInCat = inCat.filter((m) => m.completed).length;
      const score = inCat.length > 0 ? Math.round((completedInCat / inCat.length) * 100) : domain.score;
      return { ...domain, score };
    });

    // 7. Dynamic Stats Cards
    const stats: StatCard[] = [
      {
        label: "Active Applications",
        value: totalApps,
        delta: `${appliedCount} applied, ${interviewStageCount} interviewing, ${offerCount} offer`,
        deltaPositive: true,
        icon: "Send",
        color: "indigo",
      },
      {
        label: "Interviews Scheduled",
        value: scheduledInterviews.length,
        delta: `${scheduledInterviews.length} upcoming rounds`,
        deltaPositive: scheduledInterviews.length > 0,
        icon: "CalendarCheck",
        color: "emerald",
      },
      {
        label: "Latest Resume Match",
        value: `${matchScore}%`,
        delta: latestAnalysis ? `${atsScore}% ATS Parsability` : "Target: SDE II",
        deltaPositive: matchScore >= 70,
        icon: "FileText",
        color: "violet",
      },
      {
        label: "Placement Readiness",
        value: `${compositeReadiness}%`,
        delta: compositeReadiness >= 75 ? "Interview ready" : "In progress",
        deltaPositive: compositeReadiness >= 65,
        icon: "Target",
        color: "amber",
      },
    ];

    // 8. Dynamic Upcoming Interviews Widget
    const upcomingInterviews: UpcomingInterviewItem[] =
      scheduledInterviews.length > 0
        ? scheduledInterviews.map((c) => ({
            id: c.id,
            company: c.company,
            role: c.title,
            type: c.nextStep || (c.status === "Phone Screen" ? "Phone Screen" : "Technical Round"),
            date: c.nextStepDate || "Upcoming this week",
            time: "Scheduled",
            logo: c.logo || c.company.slice(0, 2).toUpperCase(),
            url: c.url,
          }))
        : [
            {
              id: "up-stripe",
              company: "Stripe",
              role: "Software Engineer II",
              type: "Technical Round",
              date: "Tomorrow",
              time: "3:00 PM IST",
              logo: "S",
            },
            {
              id: "up-notion",
              company: "Notion",
              role: "Frontend Engineer",
              type: "HR Discussion",
              date: "In 3 days",
              time: "11:00 AM IST",
              logo: "N",
            },
          ];

    return {
      stats,
      activities: getStoredActivities(),
      readinessDomains,
      upcomingInterviews,
    };
  }

  // ─── Live Mode (Supabase) ───────────────────────────────────────────────────
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(
      authError?.message || "Authentication required: please sign in to view your dashboard overview."
    );
  }

  const [appsRes, interviewsRes, resumeRes, tasksRes, completedTasksRes] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status, company, title, next_step, next_step_date, logo, application_url")
      .eq("user_id", user.id),
    supabase
      .from("interview_sessions")
      .select("id, score")
      .eq("user_id", user.id),
    supabase
      .from("resume_analyses")
      .select("match_score, ats_score")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1),
    supabase
      .from("readiness_tasks")
      .select("id, category, completed")
      .eq("user_id", user.id),
    supabase
      .from("readiness_tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("completed", true),
  ]);

  const apps = (appsRes.data || []) as any[];
  const totalApps = apps.length;
  const appliedCount = apps.filter((c: any) => c.status === "Applied").length;
  const interviewStageCount = apps.filter((c: any) => ["Phone Screen", "Interview"].includes(c.status)).length;
  const scheduledInterviews = apps.filter((c: any) => ["Phone Screen", "Interview"].includes(c.status) || !!c.next_step_date);

  const interviewSessions = (interviewsRes.data || []) as any[];
  const avgInterviewScore =
    interviewSessions.length > 0
      ? Math.round(interviewSessions.reduce((s: number, i: any) => s + (i.score || 0), 0) / interviewSessions.length)
      : 75;

  const latestResume = resumeRes.data?.[0];
  const matchScore = latestResume ? latestResume.match_score : 0;
  const atsScore = latestResume ? latestResume.ats_score : 0;

  const allTasks = tasksRes.data || [];
  const totalTasks = allTasks.length;
  const completedTasks = completedTasksRes.count ?? 0;
  const taskRatio = totalTasks > 0 ? completedTasks / totalTasks : 0;

  const taskPart = taskRatio * 100 * 0.4;
  const resumePart = ((matchScore + atsScore) / 2) * 0.3;
  const interviewPart = avgInterviewScore * 0.2;
  const pipelinePart = Math.min(100, Math.round(((appliedCount + interviewStageCount * 2) / Math.max(1, totalApps)) * 25)) * 0.1;
  const compositeReadiness = Math.min(100, Math.max(0, Math.round(taskPart + resumePart + interviewPart + pipelinePart)));

  const dynamicStats: StatCard[] = [
    {
      label: "Active Applications",
      value: totalApps,
      delta: `${appliedCount} applied, ${interviewStageCount} interviewing`,
      deltaPositive: true,
      icon: "Send",
      color: "indigo",
    },
    {
      label: "Interviews Scheduled",
      value: scheduledInterviews.length,
      delta: `${scheduledInterviews.length} rounds set`,
      deltaPositive: scheduledInterviews.length > 0,
      icon: "CalendarCheck",
      color: "emerald",
    },
    {
      label: "Latest Resume Match",
      value: latestResume ? `${matchScore}%` : "Pending",
      delta: latestResume ? `${atsScore}% ATS score` : "Upload resume to scan",
      deltaPositive: !!latestResume,
      icon: "FileText",
      color: "violet",
    },
    {
      label: "Placement Readiness",
      value: `${compositeReadiness}%`,
      delta: compositeReadiness >= 75 ? "Ready" : "Building",
      deltaPositive: compositeReadiness >= 65,
      icon: "Target",
      color: "amber",
    },
  ];

  const upcomingInterviews: UpcomingInterviewItem[] = scheduledInterviews.map((c: any) => ({
    id: c.id,
    company: c.company,
    role: c.title,
    type: c.next_step || (c.status === "Phone Screen" ? "Phone Screen" : "Technical Round"),
    date: c.next_step_date || "Upcoming",
    time: "Scheduled",
    logo: c.logo || c.company.slice(0, 2).toUpperCase(),
    url: c.application_url,
  }));

  return {
    stats: dynamicStats,
    activities: getStoredActivities(),
    readinessDomains: READINESS_DOMAINS,
    upcomingInterviews,
  };
}
