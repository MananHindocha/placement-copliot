"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FileText,
  Briefcase,
  Target,
  CalendarCheck,
  MessageSquare,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  RotateCcw,
  Check,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Flame,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Home,
  Send,
  HelpCircle,
  Award,
  Layers,
} from "lucide-react";
import { clsx } from "clsx";
import { useAgent } from "@/context/AgentProvider";
import {
  getStoredApplications,
  setStoredApplications,
  getStoredReadinessMilestones,
  setStoredReadinessMilestones,
  getStoredResumeWorkspace,
  setStoredResumeWorkspace,
  getStoredInterviewSessions,
  setStoredInterviewSessions,
  logActivity,
  dispatchCopilotUpdate,
  BOOTSTRAP_KANBAN_APPLICATIONS,
  type StoredResumeWorkspace,
} from "@/lib/storage-sync";
import { syncMockDigitalTwinFromResume } from "@/lib/agent/mock-agent-store";
import type { KanbanCard, ReadinessMilestone, InterviewSession } from "@/types";

export type WorkspaceType = "resume" | "jobs" | "readiness" | "tracker" | "interview";

interface RoleDef {
  id: string;
  name: string;
  badge: string;
  skillsHave: string[];
  skillsNeed: string[];
  avgSalary: string;
}

const POPULAR_ROLES: RoleDef[] = [
  {
    id: "backend",
    name: "Backend Developer",
    badge: "High Demand",
    skillsHave: ["Node.js", "TypeScript", "REST APIs", "SQL Basics"],
    skillsNeed: ["PostgreSQL Indexing & MVCC", "Redis & Distributed Caching", "System Design"],
    avgSalary: "₹18L – ₹30L",
  },
  {
    id: "fullstack",
    name: "Full-Stack Developer",
    badge: "Top Match (94%)",
    skillsHave: ["React 19", "Next.js", "TypeScript", "Tailwind CSS"],
    skillsNeed: ["State Machine Architecture", "Database Partitioning", "Edge Functions"],
    avgSalary: "₹20L – ₹34L",
  },
  {
    id: "ai-ml",
    name: "AI / ML Engineer",
    badge: "Trending",
    skillsHave: ["Python", "Algorithms", "Data Processing"],
    skillsNeed: ["Vector Embeddings & RAG", "LLM Fine-Tuning", "PyTorch Inference"],
    avgSalary: "₹24L – ₹40L",
  },
  {
    id: "frontend",
    name: "Frontend Developer",
    badge: "Popular",
    skillsHave: ["React", "JavaScript / ES6+", "HTML & CSS", "Responsive UI"],
    skillsNeed: ["Web Vitals & Performance", "Micro-frontends", "Design Systems"],
    avgSalary: "₹16L – ₹26L",
  },
  {
    id: "data",
    name: "Data Analyst / SDE",
    badge: "Growing",
    skillsHave: ["Python", "SQL Queries", "Pandas", "Excel"],
    skillsNeed: ["Data Warehousing (Snowflake)", "DBT Pipelines", "ETL Orchestration"],
    avgSalary: "₹14L – ₹24L",
  },
];

interface JobMatch {
  id: string;
  company: string;
  logo: string;
  title: string;
  location: string;
  salary: string;
  matchScore: number;
  deadlineTag: string;
  deadlineUrgent?: boolean;
  skillsHave: string[];
  skillsNeed: string[];
  roleId: string;
}

const CATALOG_JOBS: JobMatch[] = [
  {
    id: "job-rzp",
    company: "Razorpay",
    logo: "RZ",
    title: "Backend SDE (Payments Core)",
    location: "Bangalore (Hybrid)",
    salary: "₹24L – ₹32L",
    matchScore: 91,
    deadlineTag: "🔥 Apply within 24 hrs",
    deadlineUrgent: true,
    skillsHave: ["TypeScript", "Node.js", "REST APIs"],
    skillsNeed: ["PostgreSQL B-Tree Indexing", "Distributed Transactions"],
    roleId: "backend",
  },
  {
    id: "job-vcl",
    company: "Vercel",
    logo: "VC",
    title: "Full-Stack Product Engineer",
    location: "Remote (Global)",
    salary: "$130k – $160k",
    matchScore: 94,
    deadlineTag: "⏰ Apply within 3 Days",
    deadlineUrgent: false,
    skillsHave: ["Next.js", "TypeScript", "React 19", "Tailwind CSS"],
    skillsNeed: ["Server Component Cache Boundaries"],
    roleId: "fullstack",
  },
  {
    id: "job-notion",
    company: "Notion",
    logo: "NO",
    title: "Frontend & Collab Engineer",
    location: "Remote",
    salary: "$140k – $175k",
    matchScore: 89,
    deadlineTag: "⏰ Apply within 4 Days",
    deadlineUrgent: false,
    skillsHave: ["React", "TypeScript", "State Management"],
    skillsNeed: ["Real-time Sync (CRDTs)"],
    roleId: "frontend",
  },
  {
    id: "job-atlassian",
    company: "Atlassian",
    logo: "AT",
    title: "Distributed Systems SDE",
    location: "Bangalore (Hybrid)",
    salary: "₹28L – ₹38L",
    matchScore: 86,
    deadlineTag: "🔥 2 Days Left",
    deadlineUrgent: true,
    skillsHave: ["Java / TS", "APIs", "Data Structures"],
    skillsNeed: ["Kafka Event Streaming", "System Design"],
    roleId: "backend",
  },
  {
    id: "job-stripe",
    company: "Stripe",
    logo: "ST",
    title: "API Infrastructure SDE",
    location: "Remote",
    salary: "$150k – $190k",
    matchScore: 88,
    deadlineTag: "⏰ Apply within 5 Days",
    deadlineUrgent: false,
    skillsHave: ["TypeScript", "REST APIs", "SQL"],
    skillsNeed: ["Redis Caching", "Idempotency Patterns"],
    roleId: "backend",
  },
  {
    id: "job-openai",
    company: "Cohere / AI Lab",
    logo: "AI",
    title: "AI Solutions Engineer",
    location: "Remote / Hybrid",
    salary: "₹26L – ₹42L",
    matchScore: 85,
    deadlineTag: "⏰ Apply within 6 Days",
    deadlineUrgent: false,
    skillsHave: ["Python", "APIs", "FastAPI"],
    skillsNeed: ["Vector Search", "RAG Pipeline Tuning"],
    roleId: "ai-ml",
  },
];

interface ReadinessTopic {
  id: string;
  topic: string;
  category: string;
  skillName: string;
  hours: string;
  completed: boolean;
  priority: "high" | "medium";
}

const INITIAL_READINESS_TOPICS: ReadinessTopic[] = [
  {
    id: "topic-1",
    topic: "Resume & Portfolio Project Baseline",
    category: "Foundation",
    skillName: "TypeScript",
    hours: "Completed",
    completed: true,
    priority: "medium",
  },
  {
    id: "topic-2",
    topic: "PostgreSQL B-Tree vs Hash Indexing & MVCC Isolation",
    category: "Database & Concurrency",
    skillName: "PostgreSQL & Database Design",
    hours: "2 hours",
    completed: false,
    priority: "high",
  },
  {
    id: "topic-3",
    topic: "Redis Eviction Policies & Distributed Cache Invalidation",
    category: "Caching & Scalability",
    skillName: "Redis & Distributed Caching",
    hours: "3 hours",
    completed: false,
    priority: "high",
  },
  {
    id: "topic-4",
    topic: "System Design: Rate Limiter & Token Bucket Architecture",
    category: "System Design",
    skillName: "System Design",
    hours: "3 hours",
    completed: false,
    priority: "high",
  },
  {
    id: "topic-5",
    topic: "Node.js Event Loop Phases & Microtask Queue Timing",
    category: "Runtime Internals",
    skillName: "Node.js & Express",
    hours: "2 hours",
    completed: false,
    priority: "medium",
  },
];

interface MockQuestion {
  id: string;
  question: string;
  hint: string;
  type: "technical" | "architecture" | "behavioral";
  options: {
    id: string;
    text: string;
    isCorrect: boolean;
    feedback: string;
  }[];
}

const MOCK_QUESTIONS_POOL: Record<string, MockQuestion[]> = {
  backend: [
    {
      id: "q-be-1",
      type: "technical",
      question:
        "When handling 10,000 orders/minute in PostgreSQL, why should you avoid adding a secondary index on an UPDATE-heavy status column?",
      hint: "Think about Write Amplification and Heap-Only Tuple (HOT) optimizations.",
      options: [
        {
          id: "A",
          text: "Updating an indexed column breaks Heap-Only Tuple (HOT) optimization, causing table bloat and high WAL write amplification.",
          isCorrect: true,
          feedback:
            "Spot on! Every update to an indexed column requires updating index pointers and disables PostgreSQL HOT optimization.",
        },
        {
          id: "B",
          text: "PostgreSQL drops the table locks whenever an index page exceeds 8KB.",
          isCorrect: false,
          feedback:
            "Not quite. PostgreSQL uses row-level MVCC locking, not automatic table drop locks.",
        },
        {
          id: "C",
          text: "Secondary indexes only work on VARCHAR columns and fail on ENUM status fields.",
          isCorrect: false,
          feedback: "Incorrect. B-Tree indexes work smoothly across integer, enum, and varchar types.",
        },
      ],
    },
    {
      id: "q-be-2",
      type: "architecture",
      question:
        "Your backend API experiences sudden traffic spikes causing database connection exhaustion. Which solution is most effective?",
      hint: "Evaluate connection pooling vs increasing database connection limits.",
      options: [
        {
          id: "A",
          text: "Place PgBouncer in transaction-pooling mode in front of Postgres to reuse connections efficiently.",
          isCorrect: true,
          feedback:
            "Excellent choice. Connection poolers like PgBouncer prevent process fork overhead and connection starvation under load.",
        },
        {
          id: "B",
          text: "Increase Postgres max_connections to 50,000 in postgresql.conf.",
          isCorrect: false,
          feedback:
            "Careful! Raising max_connections too high causes OS context-switching thrashing and kernel memory exhaustion.",
        },
        {
          id: "C",
          text: "Remove all database authentication passwords to eliminate handshake latency.",
          isCorrect: false,
          feedback: "Never do this in production — this creates a catastrophic security hole.",
        },
      ],
    },
    {
      id: "q-be-3",
      type: "behavioral",
      question:
        "Tell me about a time you had to balance shipping a critical feature quickly versus writing exhaustive test suites.",
      hint: "Structure your response using STAR: Situation, Task, Action, and Result.",
      options: [
        {
          id: "A",
          text: "Prioritized integration tests for critical payment & auth paths, used contract tests for APIs, and documented technical debt with a scheduled sprint ticket.",
          isCorrect: true,
          feedback:
            "Great pragmatic engineering approach. Interviewers appreciate thoughtful risk management over dogmatic extremes.",
        },
        {
          id: "B",
          text: "Refused to ship the code until unit test coverage reached 100% across every single utility helper.",
          isCorrect: false,
          feedback:
            "Too rigid. 100% coverage often yields diminishing returns compared to critical path end-to-end tests.",
        },
        {
          id: "C",
          text: "Skipped all tests and tested manually in production since users would report bugs anyway.",
          isCorrect: false,
          feedback:
            "Red flag for engineering hiring managers! Production is not a test sandbox.",
        },
      ],
    },
  ],
  fullstack: [
    {
      id: "q-fs-1",
      type: "technical",
      question:
        "In Next.js App Router, how do Server Components improve client bundle size and latency compared to traditional client SPAs?",
      hint: "Consider JavaScript bundle payload and direct database/backend access.",
      options: [
        {
          id: "A",
          text: "Server Components execute solely on the server, streaming pre-rendered HTML/RSC payload so heavy dependencies stay out of the client JS bundle.",
          isCorrect: true,
          feedback:
            "Perfect! Heavy libraries (markdown parsers, DB drivers) never download to the client device.",
        },
        {
          id: "B",
          text: "Server Components compile all JavaScript directly into WebAssembly binary.",
          isCorrect: false,
          feedback: "Incorrect. Next.js produces standard optimized JS and RSC wire format, not WebAssembly.",
        },
        {
          id: "C",
          text: "They disable all CSS animations so the browser renders instantly.",
          isCorrect: false,
          feedback: "Incorrect. Server components are agnostic to CSS styling and animations.",
        },
      ],
    },
    {
      id: "q-fs-2",
      type: "architecture",
      question:
        "How do you handle optimistic UI updates safely when a user submits a like or bookmark action in React?",
      hint: "Think about instant UI feedback with fallback rollback on network failure.",
      options: [
        {
          id: "A",
          text: "Immediately update UI state locally via React 19 useOptimistic, send server request in background, and automatically roll back if the server returns an error.",
          isCorrect: true,
          feedback:
            "Superb! This provides zero perceived latency for the user while maintaining data integrity.",
        },
        {
          id: "B",
          text: "Show a full-page modal spinner and block all user interactions until the API responds in 500ms.",
          isCorrect: false,
          feedback: "This ruins user experience for simple micro-interactions like likes.",
        },
        {
          id: "C",
          text: "Save the like in localStorage only and never synchronize with the server.",
          isCorrect: false,
          feedback: "Data would be lost when the user logs in from another device.",
        },
      ],
    },
    {
      id: "q-fs-3",
      type: "behavioral",
      question:
        "Describe how you debug a production bug reported by users when you cannot reproduce it locally.",
      hint: "Think about observability: server logs, client telemetry, network HAR, and user session context.",
      options: [
        {
          id: "A",
          text: "Check telemetry logs (Sentry/Datadog) for stack traces, inspect payload anomalies, simulate the exact user environment & database state in staging, and add defensive logging.",
          isCorrect: true,
          feedback:
            "Demonstrates mature engineering intuition! Telemetry and reproduce-in-staging are gold standards.",
        },
        {
          id: "B",
          text: "Email the user asking them to fix their internet connection.",
          isCorrect: false,
          feedback: "Dismissive and damages user trust.",
        },
        {
          id: "C",
          text: "Restart the production server and hope it resolves itself.",
          isCorrect: false,
          feedback: "Temporary relief that hides the underlying root cause.",
        },
      ],
    },
  ],
};

export default function RobotConciergeHub() {
  const { openProbeModal, digitalTwin } = useAgent();

  // Active workspace state: null (menu) or one of the 5 workspaces
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceType | null>(null);

  // Robot emotional / visual mode: 'idle' | 'working' | 'success'
  const [robotMode, setRobotMode] = useState<"idle" | "working" | "success">("idle");

  // Robot friendly speech message
  const [speechMessage, setSpeechMessage] = useState<string>(
    "Hi! I'm your AI Placement Assistant. What would you like to do right now?"
  );

  // Follow-up suggestions shown as pills inside speech bubble
  const [followUps, setFollowUps] = useState<
    { label: string; action: () => void; iconName?: string }[]
  >([]);

  // Simple chat input text
  const [chatPrompt, setChatPrompt] = useState("");

  // Target role selection
  const [selectedRole, setSelectedRole] = useState<RoleDef>(POPULAR_ROLES[0]);
  const [customRoleInput, setCustomRoleInput] = useState("");

  // Resume Workspace state
  const [isScanningResume, setIsScanningResume] = useState(false);
  const [resumeParsed, setResumeParsed] = useState(false);
  const [atsScore, setAtsScore] = useState(78);
  const [bulletImproved, setBulletImproved] = useState(false);

  // Kanban applications state
  const [kanbanApps, setKanbanApps] = useState<KanbanCard[]>([]);

  // Readiness topics state
  const [readinessTopics, setReadinessTopics] = useState<ReadinessTopic[]>(INITIAL_READINESS_TOPICS);

  // Mock interview state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [interviewFinished, setInterviewFinished] = useState(false);
  const [interviewScore, setInterviewScore] = useState(0);

  // Load initial data from storage
  useEffect(() => {
    const apps = getStoredApplications();
    setKanbanApps(apps);

    const storedWorkspace = getStoredResumeWorkspace();
    if (storedWorkspace?.analysis) {
      setResumeParsed(true);
      setAtsScore(storedWorkspace.analysis.atsScore || 78);
    }
  }, []);

  // Calculate live upcoming deadlines
  const urgentDeadlines = useMemo(() => {
    return kanbanApps.filter(
      (app) =>
        app.status === "Applied" ||
        app.status === "Phone Screen" ||
        app.status === "Interview"
    );
  }, [kanbanApps]);

  // Overall readiness percentage computed from completed topics
  const readinessPercentage = useMemo(() => {
    const completedCount = readinessTopics.filter((t) => t.completed).length;
    return Math.round((completedCount / readinessTopics.length) * 100);
  }, [readinessTopics]);

  // ─── Return to Options Menu ───────────────────────────────────────────────
  const showAllOptions = useCallback(() => {
    setActiveWorkspace(null);
    setRobotMode("idle");
    setSpeechMessage("What would you like to work on next? Pick any option below!");
    setFollowUps([]);
  }, []);

  // ─── Workspace Switcher with Robot Hand-off ────────────────────────────────
  const openWorkspace = useCallback((ws: WorkspaceType) => {
    setActiveWorkspace(ws);
    setRobotMode("idle");

    if (ws === "resume") {
      setSpeechMessage(
        "Upload your resume or click 'Try with Sample Resume' — I will extract your skills and help improve weak bullet points."
      );
      setFollowUps([
        {
          label: "🎯 Pick Target Role",
          action: () => openWorkspace("jobs"),
        },
        {
          label: "📚 Check Study Plan",
          action: () => openWorkspace("readiness"),
        },
        {
          label: "⏰ View Applications",
          action: () => openWorkspace("tracker"),
        },
      ]);
    } else if (ws === "jobs") {
      setSpeechMessage(
        "Which role are you aiming for? Pick your target role and I'll fetch matching jobs with deadline alerts!"
      );
      setFollowUps([
        {
          label: "📚 See What to Study",
          action: () => openWorkspace("readiness"),
        },
        {
          label: "⏰ View Application Board",
          action: () => openWorkspace("tracker"),
        },
        {
          label: "🎤 Practice Mock Interview",
          action: () => openWorkspace("interview"),
        },
      ]);
    } else if (ws === "readiness") {
      setSpeechMessage(
        "Here is your personalized study checklist! Check off topics as you study or click '60s Quick Check' to verify instantly."
      );
      setFollowUps([
        {
          label: "🎯 Find Matched Jobs",
          action: () => openWorkspace("jobs"),
        },
        {
          label: "🎤 Test with Mock Interview",
          action: () => openWorkspace("interview"),
        },
        {
          label: "⏰ View Upcoming Deadlines",
          action: () => openWorkspace("tracker"),
        },
      ]);
    } else if (ws === "tracker") {
      setSpeechMessage(
        "Here is your active application pipeline. Move cards as you progress, and never miss an Online Assessment deadline!"
      );
      setFollowUps([
        {
          label: "🎯 Browse More Jobs",
          action: () => openWorkspace("jobs"),
        },
        {
          label: "📚 Check Readiness Plan",
          action: () => openWorkspace("readiness"),
        },
        {
          label: "🎤 Practice for Interview",
          action: () => openWorkspace("interview"),
        },
      ]);
    } else if (ws === "interview") {
      setSpeechMessage(
        "Ready to practice? Answer 3 quick role-specific questions and get instant feedback on what to improve."
      );
      setCurrentQuestionIndex(0);
      setSelectedOptionId(null);
      setAnswerSubmitted(false);
      setInterviewFinished(false);
      setFollowUps([
        {
          label: "📚 See What to Study",
          action: () => openWorkspace("readiness"),
        },
        {
          label: "⏰ View Applications",
          action: () => openWorkspace("tracker"),
        },
        {
          label: "🎯 Browse Jobs",
          action: () => openWorkspace("jobs"),
        },
      ]);
    }
  }, []);

  // ─── Plain English Chat Intent Parser ─────────────────────────────────────
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = chatPrompt.trim().toLowerCase();
    if (!query) return;

    if (query.includes("resume") || query.includes("cv") || query.includes("bullet")) {
      openWorkspace("resume");
    } else if (query.includes("job") || query.includes("role") || query.includes("backend") || query.includes("frontend") || query.includes("dev")) {
      if (query.includes("backend")) setSelectedRole(POPULAR_ROLES[0]);
      if (query.includes("frontend")) setSelectedRole(POPULAR_ROLES[3]);
      if (query.includes("full")) setSelectedRole(POPULAR_ROLES[1]);
      if (query.includes("ai") || query.includes("ml")) setSelectedRole(POPULAR_ROLES[2]);
      openWorkspace("jobs");
    } else if (query.includes("study") || query.includes("readiness") || query.includes("topic") || query.includes("plan") || query.includes("prepare")) {
      openWorkspace("readiness");
    } else if (query.includes("track") || query.includes("kanban") || query.includes("deadline") || query.includes("apply") || query.includes("application")) {
      openWorkspace("tracker");
    } else if (query.includes("interview") || query.includes("mock") || query.includes("question") || query.includes("practice")) {
      openWorkspace("interview");
    } else {
      // Default: open readiness and provide helpful prompt
      setSpeechMessage(`I found several ways to help with "${chatPrompt}". Let's start with your study and readiness plan!`);
      openWorkspace("readiness");
    }
    setChatPrompt("");
  };

  // ─── ACTION 1: Run Resume Scan / Extraction ────────────────────────────────
  const handleScanSampleResume = () => {
    setIsScanningResume(true);
    setRobotMode("working");
    setSpeechMessage("🤖 Scanning your resume and extracting verified skills & projects...");

    setTimeout(() => {
      setIsScanningResume(false);
      setResumeParsed(true);
      setRobotMode("success");
      setAtsScore(82);

      // Sync mock agent store and storage
      try {
        syncMockDigitalTwinFromResume("demo-user", "Alex_Rivera_Resume_2026.pdf");
        dispatchCopilotUpdate("resume");
      } catch (err) {
        console.warn("Sync resume error:", err);
      }

      setSpeechMessage(
        "Awesome! I extracted 12 skills and 3 projects from your resume. Your initial ATS match is 82%. I also found a bullet point we can improve!"
      );

      setFollowUps([
        {
          label: "🎯 Pick Target Role & Fetch Jobs",
          action: () => openWorkspace("jobs"),
        },
        {
          label: "📚 See My Study & Readiness Plan",
          action: () => openWorkspace("readiness"),
        },
        {
          label: "⏰ Open Application Tracker",
          action: () => openWorkspace("tracker"),
        },
      ]);
    }, 1200);
  };

  // Apply Resume Bullet Improvement
  const handleApplyBulletImprovement = () => {
    setBulletImproved(true);
    setAtsScore((prev) => Math.min(prev + 6, 94));
    setRobotMode("success");
    setSpeechMessage(
      "High impact bullet applied! Your ATS score jumped to 88%. This makes your resume stand out for top engineering screens."
    );
    logActivity({
      type: "resume",
      message: "Applied high-impact bullet point rewrite (ATS score +6%)",
    });
  };

  // ─── ACTION 2: Auto-Add Top 4 Jobs to Kanban ──────────────────────────────
  const handleAutoAddTop4Jobs = () => {
    setRobotMode("working");
    setSpeechMessage("🤖 Adding top 4 matched jobs to your Application Tracker pipeline...");

    setTimeout(() => {
      const top4 = CATALOG_JOBS.slice(0, 4).map((j, idx) => ({
        id: `auto-${j.id}-${Date.now()}`,
        company: j.company,
        logo: j.logo,
        title: j.title,
        status: (idx < 2 ? "Applied" : "Wishlist") as any,
        matchScore: j.matchScore,
        priority: "high" as const,
        salary: j.salary,
        nextStep: idx === 0 ? "Technical OA (24h left)" : "Application Review",
        skills: [...j.skillsHave, ...j.skillsNeed],
        source: "demo" as const,
        appliedDate: new Date().toISOString().split("T")[0],
      }));

      setStoredApplications(top4);
      setKanbanApps(top4);
      setRobotMode("success");
      setSpeechMessage(
        "Done! Seeded 4 matched jobs into your Kanban board with deadline tags. What should we do next?"
      );

      setFollowUps([
        {
          label: "⏰ Open Application Board",
          action: () => openWorkspace("tracker"),
        },
        {
          label: "📚 See Topics I Need to Study",
          action: () => openWorkspace("readiness"),
        },
        {
          label: "🎤 Practice Mock Interview",
          action: () => openWorkspace("interview"),
        },
      ]);
    }, 800);
  };

  // Add individual job to Kanban
  const handleTrackSingleJob = (job: JobMatch) => {
    const newCard: KanbanCard = {
      id: `app-${job.id}-${Date.now()}`,
      company: job.company,
      logo: job.logo,
      title: job.title,
      status: "Wishlist",
      matchScore: job.matchScore,
      priority: "high",
      salary: job.salary,
      nextStep: "Submit Application",
      skills: [...job.skillsHave, ...job.skillsNeed],
      source: "demo" as const,
      appliedDate: new Date().toISOString().split("T")[0],
    };

    const updated = [newCard, ...kanbanApps];
    setStoredApplications(updated);
    setKanbanApps(updated);
    setRobotMode("success");
    setSpeechMessage(`Added ${job.company} (${job.title}) to your Wishlist in the Application Tracker!`);
  };

  // ─── ACTION 3: Toggle Study Checklist Item ────────────────────────────────
  const handleToggleTopic = (topicId: string) => {
    setReadinessTopics((prev) => {
      const updated = prev.map((t) => (t.id === topicId ? { ...t, completed: !t.completed } : t));
      return updated;
    });

    setRobotMode("success");
    setSpeechMessage("Great job! Updating your overall readiness progress in real time.");
  };

  // Verify Topic with 60s Micro-Probe
  const handleLaunchMicroProbeForTopic = (skillName: string, topicId: string) => {
    openProbeModal(skillName);
    // Mark as completed when micro-probe finishes
    setTimeout(() => {
      setReadinessTopics((prev) =>
        prev.map((t) => (t.id === topicId ? { ...t, completed: true } : t))
      );
    }, 1500);
  };

  // ─── ACTION 4: Move Kanban Card Status ────────────────────────────────────
  const handleMoveKanbanCard = (cardId: string, newStatus: KanbanCard["status"]) => {
    const targetCard = kanbanApps.find((c) => c.id === cardId);
    const updated = kanbanApps.map((c) => (c.id === cardId ? { ...c, status: newStatus } : c));
    setStoredApplications(updated);
    setKanbanApps(updated);

    if (newStatus === "Interview" && targetCard) {
      setRobotMode("success");
      setSpeechMessage(
        `🎉 Incredible! You moved ${targetCard.company} to Interviewing! I have prepared your tailored prep sprint. Would you like to practice a mock interview for ${targetCard.company} right now?`
      );
      setFollowUps([
        {
          label: `🎤 Practice Mock Interview for ${targetCard.company}`,
          action: () => openWorkspace("interview"),
        },
        {
          label: "📚 Check Study Checklist",
          action: () => openWorkspace("readiness"),
        },
        {
          label: "🏠 Show All Options",
          action: showAllOptions,
        },
      ]);
    } else {
      setRobotMode("success");
      setSpeechMessage(`Card updated to "${newStatus}"!`);
    }
  };

  // ─── ACTION 5: Mock Interview Handling ────────────────────────────────────
  const questionsForRole = MOCK_QUESTIONS_POOL[selectedRole.id] || MOCK_QUESTIONS_POOL.backend;
  const currentQuestion = questionsForRole[currentQuestionIndex] || questionsForRole[0];

  const handleSubmitAnswer = () => {
    if (!selectedOptionId) return;
    setAnswerSubmitted(true);
    const opt = currentQuestion.options.find((o) => o.id === selectedOptionId);
    if (opt?.isCorrect) {
      setInterviewScore((prev) => prev + 33);
      setRobotMode("success");
    } else {
      setRobotMode("idle");
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex + 1 < questionsForRole.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedOptionId(null);
      setAnswerSubmitted(false);
      setRobotMode("idle");
      setSpeechMessage("Next question! Take your time and pick the most defensible engineering answer.");
    } else {
      // Completed interview
      setInterviewFinished(true);
      const finalScore = Math.min(interviewScore + 34, 100);
      setRobotMode("success");
      setSpeechMessage(
        `🎉 Interview practice completed! You scored ${finalScore}/100. I automatically added 'Redis Caching & Invalidation' to your study checklist so you're 100% prepared.`
      );

      // Log session
      const newSession: InterviewSession = {
        id: `sess-${Date.now()}`,
        date: "Today",
        role: `${selectedRole.name} — Practice Session`,
        score: finalScore,
        questionsAnswered: questionsForRole.length,
        duration: "3 mins",
        feedback: "Strong core architecture intuition. Practice caching trade-offs for live rounds.",
      };
      const sessions = getStoredInterviewSessions();
      setStoredInterviewSessions([newSession, ...sessions]);

      setFollowUps([
        {
          label: "📚 See Updated Readiness Plan",
          action: () => openWorkspace("readiness"),
        },
        {
          label: "⏰ View Applications in Tracker",
          action: () => openWorkspace("tracker"),
        },
        {
          label: "🎯 Browse Matching Jobs",
          action: () => openWorkspace("jobs"),
        },
      ]);
    }
  };

  return (
    <div id="robot-assistant" className="relative space-y-6">
      {/* Inline styles for robot animation & pulses */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float-robot {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes scan-beam {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateY(100%); opacity: 0; }
        }
        .animate-float-robot {
          animation: float-robot 4s ease-in-out infinite;
        }
        .animate-scan-beam {
          animation: scan-beam 2s ease-in-out infinite;
        }
      `}} />

      {/* ─── ROBOT CONCIERGE HEADER & SPEECH BUBBLE ──────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/25 bg-gradient-to-br from-[#0a0d1d] via-[#0d1229] to-[#070914] p-5 sm:p-7 shadow-2xl backdrop-blur-2xl">
        {/* Ambient atmospheric glows */}
        <div className="absolute -left-12 -top-12 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -right-12 -bottom-12 h-44 w-44 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-5 sm:gap-6">
          {/* ─── THE ANIMATED ROBOT AVATAR ─────────────────────────────────── */}
          <div className="shrink-0 flex items-center gap-3">
            <div className="relative">
              {/* Outer pulsing halo */}
              <div
                className={clsx(
                  "absolute -inset-1.5 rounded-2xl blur-md transition-all duration-700",
                  robotMode === "working"
                    ? "bg-amber-400/40 animate-pulse"
                    : robotMode === "success"
                    ? "bg-emerald-400/40 animate-pulse"
                    : "bg-cyan-500/20 group-hover:bg-cyan-500/30"
                )}
              />

              {/* Robot Frame */}
              <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-2xl border border-indigo-400/30 bg-gradient-to-b from-[#13193a] to-[#0a0d20] shadow-xl animate-float-robot overflow-hidden">
                {/* Working Scanning Line */}
                {robotMode === "working" && (
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent animate-scan-beam pointer-events-none" />
                )}

                {/* SVG Robot Mascot */}
                <svg
                  className="h-14 w-14 sm:h-16 sm:w-16"
                  viewBox="0 0 72 72"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {/* Antennas */}
                  <line x1="36" y1="12" x2="36" y2="4" stroke="#777CFF" strokeWidth="2.5" strokeLinecap="round" />
                  <circle
                    cx="36"
                    cy="4"
                    r="3.5"
                    fill={robotMode === "working" ? "#F59E0B" : robotMode === "success" ? "#10B981" : "#454BFF"}
                    className={clsx(robotMode !== "idle" && "animate-ping")}
                  />
                  <circle
                    cx="36"
                    cy="4"
                    r="3.5"
                    fill={robotMode === "working" ? "#F59E0B" : robotMode === "success" ? "#10B981" : "#00F0FF"}
                  />

                  {/* Robot Head Outer */}
                  <rect
                    x="12"
                    y="14"
                    width="48"
                    height="42"
                    rx="14"
                    fill="#151A38"
                    stroke="#454BFF"
                    strokeWidth="2.5"
                  />

                  {/* Ears */}
                  <rect x="6" y="27" width="6" height="16" rx="3" fill="#292EDB" />
                  <rect x="60" y="27" width="6" height="16" rx="3" fill="#292EDB" />

                  {/* Visor Display */}
                  <rect
                    x="18"
                    y="22"
                    width="36"
                    height="24"
                    rx="8"
                    fill="#080A18"
                    stroke={robotMode === "working" ? "#F59E0B" : robotMode === "success" ? "#10B981" : "#00F0FF"}
                    strokeWidth="1.5"
                  />

                  {/* Robot Eyes Modes */}
                  {robotMode === "success" ? (
                    // Happy ^ ^ eyes
                    <g stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 35 L27 30 L31 35" />
                      <path d="M41 35 L45 30 L49 35" />
                    </g>
                  ) : robotMode === "working" ? (
                    // Scanning eyes
                    <g>
                      <circle cx="28" cy="33" r="3.5" fill="#F59E0B" className="animate-pulse" />
                      <circle cx="44" cy="33" r="3.5" fill="#F59E0B" className="animate-pulse" />
                      <line x1="22" y1="33" x2="50" y2="33" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3 3" />
                    </g>
                  ) : (
                    // Friendly cyan glowing eyes
                    <g>
                      <circle cx="27" cy="33" r="4" fill="#00F0FF" />
                      <circle cx="29" cy="31" r="1.5" fill="#FFFFFF" />
                      <circle cx="45" cy="33" r="4" fill="#00F0FF" />
                      <circle cx="47" cy="31" r="1.5" fill="#FFFFFF" />
                    </g>
                  )}

                  {/* Cheerful mouth / audio wave */}
                  {robotMode === "success" ? (
                    <path d="M31 41 Q36 45 41 41" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
                  ) : (
                    <line x1="32" y1="41" x2="40" y2="41" stroke="#454BFF" strokeWidth="2" strokeLinecap="round" />
                  )}
                </svg>

                {/* Status Dot */}
                <span
                  className={clsx(
                    "absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full border border-black",
                    robotMode === "working"
                      ? "bg-amber-400 animate-ping"
                      : robotMode === "success"
                      ? "bg-emerald-400"
                      : "bg-cyan-400"
                  )}
                />
              </div>
            </div>

            {/* Mobile / Compact Label */}
            <div className="md:hidden">
              <span className="text-xs font-bold text-white tracking-wide">AI Assistant</span>
              <p className="text-[10px] text-cyan-300">Ready to help</p>
            </div>
          </div>

          {/* ─── SPEECH BUBBLE & QUICK CHOICES ───────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Bubble Container */}
            <div className="relative rounded-2xl border border-indigo-400/25 bg-black/40 backdrop-blur-xl p-4 sm:p-5 shadow-lg">
              {/* Pointer Triangle for speech bubble */}
              <div className="hidden md:block absolute -left-2 top-7 h-4 w-4 -rotate-45 border-l border-t border-indigo-400/25 bg-black/40" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-0.5 text-[11px] font-semibold text-cyan-300">
                      <Sparkles className="h-3 w-3" />
                      AI Placement Assistant
                    </span>

                    {urgentDeadlines.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                        <Flame className="h-3 w-3" />
                        {urgentDeadlines.length} Upcoming Deadlines
                      </span>
                    )}

                    {activeWorkspace && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-[11px] text-indigo-300 capitalize">
                        Viewing: {activeWorkspace}
                      </span>
                    )}
                  </div>

                  <p className="text-sm sm:text-base font-medium text-slate-100 leading-snug">
                    {speechMessage}
                  </p>
                </div>

                {/* Return to Options Menu Button */}
                {activeWorkspace !== null && (
                  <button
                    type="button"
                    onClick={showAllOptions}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 hover:bg-indigo-500/25 px-3 py-1.5 text-xs font-semibold text-indigo-200 transition-all cursor-pointer"
                  >
                    <Home className="h-3.5 w-3.5" />
                    <span>Show All Options</span>
                  </button>
                )}
              </div>

              {/* Follow-up Smart Pills (Inside Speech Bubble) */}
              {followUps.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400 font-medium">Suggested Next Steps:</span>
                  {followUps.map((pill, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={pill.action}
                      className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-400/30 px-3 py-1 text-xs font-semibold text-white transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span>{pill.label}</span>
                      <ArrowRight className="h-3 w-3 text-cyan-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── NATURAL LANGUAGE CHAT INPUT BAR ───────────────────────────── */}
        <form onSubmit={handleChatSubmit} className="relative mt-4 z-10">
          <div className="relative flex items-center">
            <input
              type="text"
              value={chatPrompt}
              onChange={(e) => setChatPrompt(e.target.value)}
              placeholder="Or tell me in plain English: 'I want to be a backend developer', 'Improve my resume', 'Check deadlines'..."
              className="w-full rounded-2xl border border-indigo-500/25 bg-black/40 pl-4 pr-24 py-2.5 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400/50 backdrop-blur-md transition-all"
            />
            <button
              type="submit"
              className="absolute right-1.5 inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md hover:from-indigo-500 hover:to-cyan-400 transition-all cursor-pointer"
            >
              <span>Ask</span>
              <Send className="h-3 w-3" />
            </button>
          </div>
        </form>
      </div>

      {/* ─── THE 5 MAIN OPTION CARDS (SHOWN WHEN NO WORKSPACE IS ACTIVE) ──── */}
      {activeWorkspace === null && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Choose What You Want To Do
            </h3>
            <span className="text-xs text-slate-500">Pick any option to open its workspace</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* OPTION 1: Resume Upload & Scan */}
            <div
              onClick={() => openWorkspace("resume")}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-indigo-500/20 bg-gradient-to-b from-[#0d1024] to-[#070914] p-5 shadow-lg hover:border-indigo-400/50 hover:shadow-indigo-500/10 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 group-hover:scale-110 transition-transform">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-semibold text-indigo-300">
                  Option 1
                </span>
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors">
                📄 Upload &amp; Scan My Resume
              </h4>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Extract your skills into your profile and let me improve weak bullet points with 1-click improvements.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-indigo-400 group-hover:text-cyan-300 transition-colors">
                <span>Start Resume Scan</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* OPTION 2: Pick Role & Find Jobs */}
            <div
              onClick={() => openWorkspace("jobs")}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-b from-[#141209] to-[#070914] p-5 shadow-lg hover:border-amber-400/50 hover:shadow-amber-500/10 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 group-hover:scale-110 transition-transform">
                  <Briefcase className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                  Option 2
                </span>
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                🎯 Pick Target Role &amp; Find Jobs
              </h4>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Tell me your dream role and I&apos;ll fetch matching jobs with Match % and highlight skills you already have vs need.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-amber-400 group-hover:text-amber-300 transition-colors">
                <span>Select Role &amp; Browse</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* OPTION 3: My Readiness Plan */}
            <div
              onClick={() => openWorkspace("readiness")}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-b from-[#09131d] to-[#070914] p-5 shadow-lg hover:border-sky-400/50 hover:shadow-sky-500/10 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400 group-hover:scale-110 transition-transform">
                  <Target className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                  Option 3
                </span>
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-sky-300 transition-colors">
                📚 My Readiness Plan &amp; Progress
              </h4>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                See the exact topics you need to cover, check them off as you study, or take 60-second micro-checks.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-sky-400 group-hover:text-sky-300 transition-colors">
                <span>View Study Checklist</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* OPTION 4: Track Applications & Deadlines */}
            <div
              onClick={() => openWorkspace("tracker")}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-[#091712] to-[#070914] p-5 shadow-lg hover:border-emerald-400/50 hover:shadow-emerald-500/10 hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 group-hover:scale-110 transition-transform">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  Option 4
                </span>
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                ⏰ Track Applications &amp; Deadlines
              </h4>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Manage your 4-stage pipeline so you never miss an Online Assessment or interview action date.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-400 group-hover:text-emerald-300 transition-colors">
                <span>Open Kanban Board</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* OPTION 5: Quick Mock Interview */}
            <div
              onClick={() => openWorkspace("interview")}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-b from-[#150a1d] to-[#070914] p-5 shadow-lg hover:border-purple-400/50 hover:shadow-purple-500/10 hover:-translate-y-0.5 transition-all md:col-span-2 lg:col-span-1"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 group-hover:scale-110 transition-transform">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-purple-500/15 border border-purple-500/30 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                  Option 5
                </span>
              </div>
              <h4 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                🎤 Practice a Quick Mock Interview
              </h4>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Test yourself with 3 realistic role questions and get instant feedback with tips to ace real rounds.
              </p>
              <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-purple-400 group-hover:text-purple-300 transition-colors">
                <span>Start 3-Question Practice</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── ZERO CLUTTER WORKSPACE 1: RESUME SCAN & EXTRACTION ──────────── */}
      {activeWorkspace === "resume" && (
        <div className="rounded-3xl border border-indigo-500/30 bg-[#0a0d1e] p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">📄 Resume Upload &amp; Skill Extraction</h3>
                <p className="text-xs text-slate-400">
                  Upload your resume or use our sample profile to extract verified skills and improve bullet points.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={showAllOptions}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Menu
            </button>
          </div>

          {/* Upload Dropzone / Quick Sample Trigger */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-500/30 bg-black/30 p-6 text-center hover:border-indigo-400 transition-all">
              <FileText className="h-8 w-8 text-indigo-400 mb-2" />
              <p className="text-xs font-semibold text-white">Drag &amp; drop your resume (PDF / DOCX)</p>
              <p className="text-[11px] text-slate-400 mt-1">or click to browse from device</p>
              <button
                type="button"
                onClick={handleScanSampleResume}
                disabled={isScanningResume}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 px-3 py-1.5 text-xs font-semibold text-indigo-200 transition-all cursor-pointer"
              >
                <span>Upload File</span>
              </button>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/20 to-black/30 p-6">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 mb-2">
                  ⚡ Instant Hackathon Demo
                </span>
                <h4 className="text-sm font-bold text-white">Try with Sample Full-Stack Resume</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Load Alex Rivera&apos;s verified engineering resume (Next.js, TypeScript, PostgreSQL, REST APIs) in 1 click.
                </p>
              </div>

              <button
                type="button"
                onClick={handleScanSampleResume}
                disabled={isScanningResume}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg hover:from-cyan-500 hover:to-indigo-500 active:scale-[0.98] transition-all cursor-pointer"
              >
                {isScanningResume ? (
                  <>
                    <RotateCcw className="h-3.5 w-3.5 animate-spin" />
                    <span>Extracting Skills...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>⚡ Try with Sample Resume</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Summary Card */}
          {resumeParsed && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl border border-indigo-500/20 bg-black/40 p-4">
                  <span className="text-[11px] text-slate-400 font-medium">ATS Match Score</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-emerald-400">{atsScore}%</span>
                    <span className="text-xs text-emerald-400/80">Strong Baseline</span>
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-500/20 bg-black/40 p-4">
                  <span className="text-[11px] text-slate-400 font-medium">Verified Core Skills</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">12 Skills</span>
                    <span className="text-xs text-slate-400">Extracted</span>
                  </div>
                </div>

                <div className="rounded-xl border border-indigo-500/20 bg-black/40 p-4">
                  <span className="text-[11px] text-slate-400 font-medium">Projects Detected</span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-cyan-300">3 Projects</span>
                    <span className="text-xs text-slate-400">Production Tier</span>
                  </div>
                </div>
              </div>

              {/* Extracted Skills Chips */}
              <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                  Extracted Skills &amp; Strength Level
                </h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: "TypeScript", level: "Verified Strong", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
                    { name: "React 19 & Next.js", level: "Verified Strong", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
                    { name: "Data Structures (DSA)", level: "Verified Strong", color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300" },
                    { name: "Node.js & Express", level: "Good Foundation", color: "bg-indigo-500/15 border-indigo-500/30 text-indigo-300" },
                    { name: "PostgreSQL & Relational DB", level: "Needs Practice", color: "bg-amber-500/15 border-amber-500/30 text-amber-300" },
                    { name: "Redis Caching", level: "Needs Practice", color: "bg-amber-500/15 border-amber-500/30 text-amber-300" },
                  ].map((skill, idx) => (
                    <span
                      key={idx}
                      className={clsx(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border",
                        skill.color
                      )}
                    >
                      <span>{skill.name}</span>
                      <span className="text-[10px] opacity-75">• {skill.level}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Before vs. After Suggestion Card */}
              <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-[#121633] to-black/60 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    <h4 className="text-sm font-bold text-white">Suggested High-Impact Resume Improvement</h4>
                  </div>
                  {bulletImproved ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                      <Check className="h-3 w-3" />
                      Applied to Resume
                    </span>
                  ) : (
                    <span className="text-xs text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                      +6% ATS Boost
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-rose-500/20 bg-rose-950/15 p-3.5 space-y-1">
                    <span className="font-semibold text-rose-300">❌ Before (Weak / Generic):</span>
                    <p className="text-slate-300 leading-relaxed">
                      &quot;Worked on backend APIs using Node.js and PostgreSQL database for e-commerce website.&quot;
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 space-y-1">
                    <span className="font-semibold text-emerald-300">✅ After (High-Impact AI Rewrite):</span>
                    <p className="text-slate-200 leading-relaxed font-medium">
                      &quot;Architected high-throughput REST &amp; GraphQL APIs in Node.js with PostgreSQL connection pooling, decreasing p95 checkout latency by 42% under 10k concurrent RPS.&quot;
                    </p>
                  </div>
                </div>

                {!bulletImproved && (
                  <button
                    type="button"
                    onClick={handleApplyBulletImprovement}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>✓ Apply Improvement to My Resume</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── ZERO CLUTTER WORKSPACE 2: TARGET ROLE & JOB FETCHER ─────────── */}
      {activeWorkspace === "jobs" && (
        <div className="rounded-3xl border border-amber-500/30 bg-[#0e0d16] p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">🎯 Target Role &amp; Matched Jobs</h3>
                <p className="text-xs text-slate-400">
                  Select your dream engineering role to see matched opportunities and skill requirements.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={showAllOptions}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Menu
            </button>
          </div>

          {/* 1-Click Role Selector Pills */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Which role are you aiming for?
            </label>
            <div className="flex flex-wrap gap-2">
              {POPULAR_ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => {
                    setSelectedRole(role);
                    setRobotMode("working");
                    setSpeechMessage(`Fetching top jobs matching your profile for ${role.name}...`);
                    setTimeout(() => {
                      setRobotMode("success");
                      setSpeechMessage(`Found matched opportunities for ${role.name}! Notice which skills you already have vs what to study.`);
                    }, 500);
                  }}
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold transition-all cursor-pointer border",
                    selectedRole.id === role.id
                      ? "bg-amber-500 text-black border-amber-400 shadow-md scale-102"
                      : "bg-black/40 text-slate-300 border-white/10 hover:border-amber-500/40 hover:text-white"
                  )}
                >
                  <span>{role.name}</span>
                  <span
                    className={clsx(
                      "text-[10px] px-1.5 py-0.5 rounded-md",
                      selectedRole.id === role.id ? "bg-black/20 text-black font-bold" : "bg-white/10 text-slate-400"
                    )}
                  >
                    {role.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Header: Found Opportunities & 1-Click Auto-Add */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/40 p-4">
            <div>
              <h4 className="text-sm font-bold text-white">
                Matched Opportunities for {selectedRole.name}
              </h4>
              <p className="text-xs text-slate-400">
                Average Market Salary: <span className="text-emerald-400 font-semibold">{selectedRole.avgSalary}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleAutoAddTop4Jobs}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-xs font-semibold text-black shadow-lg hover:from-amber-400 hover:to-orange-400 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>⚡ Auto-Add Top 4 to Tracker</span>
            </button>
          </div>

          {/* Matched Job Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CATALOG_JOBS.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3 hover:border-amber-500/30 transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-sm">
                      {job.logo}
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-white">{job.title}</h5>
                      <p className="text-xs text-slate-400">
                        {job.company} • {job.location}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
                    {job.matchScore}% Match
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs border-y border-white/5 py-2">
                  <span className="text-slate-300 font-medium">{job.salary}</span>
                  <span
                    className={clsx(
                      "font-semibold text-[11px]",
                      job.deadlineUrgent ? "text-rose-400" : "text-amber-400"
                    )}
                  >
                    {job.deadlineTag}
                  </span>
                </div>

                {/* Skills You Have vs Skills to Cover */}
                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-[11px] text-emerald-400 font-semibold">
                      ✅ Skills You Already Have:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {job.skillsHave.map((sk, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-amber-400 font-semibold">
                      ⚡ Skills You Need to Cover:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {job.skillsNeed.map((sk, idx) => (
                        <span
                          key={idx}
                          className="rounded-md bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleTrackSingleJob(job)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
                  >
                    <span>+ Track in Kanban</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openWorkspace("readiness")}
                    className="text-xs text-slate-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Study for this role</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── ZERO CLUTTER WORKSPACE 3: READINESS PLAN & PROGRESS ─────────── */}
      {activeWorkspace === "readiness" && (
        <div className="rounded-3xl border border-sky-500/30 bg-[#09111c] p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">📚 My Readiness Plan &amp; Progress</h3>
                <p className="text-xs text-slate-400">
                  Plain-English study checklist. Check topics off as you prepare or click &quot;Quick Check&quot; to verify.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={showAllOptions}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Menu
            </button>
          </div>

          {/* Big Animated Readiness Bar */}
          <div className="rounded-2xl border border-sky-500/25 bg-black/40 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
                  Overall Preparation Progress
                </span>
                <h4 className="text-xl font-bold text-white mt-0.5">
                  {readinessPercentage}% Ready for {selectedRole.name}
                </h4>
              </div>

              <span className="rounded-full bg-sky-500/15 border border-sky-500/30 px-3 py-1 text-xs font-semibold text-sky-300">
                {readinessTopics.filter((t) => t.completed).length} of {readinessTopics.length} Topics Completed
              </span>
            </div>

            <div className="h-3 w-full rounded-full bg-slate-900 border border-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${readinessPercentage}%` }}
              />
            </div>
          </div>

          {/* Actionable Study Checklist */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Topics to Study (Click to Mark Completed or Test Yourself)
            </h4>

            <div className="space-y-2.5">
              {readinessTopics.map((topic) => (
                <div
                  key={topic.id}
                  className={clsx(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border p-4 transition-all",
                    topic.completed
                      ? "border-emerald-500/30 bg-emerald-950/10"
                      : "border-white/10 bg-black/30 hover:border-sky-500/30"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => handleToggleTopic(topic.id)}
                      className={clsx(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all cursor-pointer",
                        topic.completed
                          ? "bg-emerald-500 border-emerald-400 text-black"
                          : "border-slate-500 hover:border-sky-400"
                      )}
                    >
                      {topic.completed && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </button>

                    <div>
                      <p
                        className={clsx(
                          "text-sm font-semibold transition-colors",
                          topic.completed ? "text-slate-400 line-through" : "text-white"
                        )}
                      >
                        {topic.topic}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                        <span className="text-sky-300 font-medium">{topic.category}</span>
                        <span>•</span>
                        <span>Est: {topic.hours}</span>
                        {topic.priority === "high" && (
                          <>
                            <span>•</span>
                            <span className="text-amber-400 font-medium">Important for Interviews</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleLaunchMicroProbeForTopic(topic.skillName, topic.id)}
                      className="inline-flex items-center gap-1 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 px-3 py-1.5 text-xs font-semibold text-sky-200 transition-all cursor-pointer"
                    >
                      <Zap className="h-3.5 w-3.5 text-sky-400" />
                      <span>⚡ Quick 60s Check</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Plain-English Skills Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="rounded-2xl border border-emerald-500/20 bg-black/40 p-4 space-y-2">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                ✅ Verified Strong
              </span>
              <p className="text-xs text-slate-400">
                You have demonstrated proof in these areas. Great job!
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["TypeScript", "React & Next.js", "Data Structures", "REST APIs"].map((s, i) => (
                  <span
                    key={i}
                    className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-medium text-emerald-300"
                  >
                    ✓ {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-amber-500/20 bg-black/40 p-4 space-y-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                ⚡ Needs Practice
              </span>
              <p className="text-xs text-slate-400">
                Review these before your live rounds to feel 100% confident.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["PostgreSQL Indexing", "Redis Caching", "System Design"].map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => openProbeModal(s)}
                    className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-xs font-medium text-amber-300 hover:bg-amber-500/20 cursor-pointer"
                  >
                    ⚡ Test {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── ZERO CLUTTER WORKSPACE 4: SMART KANBAN & DEADLINE BOARD ─────── */}
      {activeWorkspace === "tracker" && (
        <div className="rounded-3xl border border-emerald-500/30 bg-[#08130e] p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">⏰ Application Tracker &amp; Deadlines</h3>
                <p className="text-xs text-slate-400">
                  Manage your active pipeline. Moving cards to &quot;Interviewing&quot; triggers our tailored sprint prep.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={showAllOptions}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Menu
            </button>
          </div>

          {/* Upcoming Deadlines & Reminders Banner */}
          <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/20 via-black/40 to-transparent p-4">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="h-4 w-4 text-amber-400" />
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                🔔 Upcoming Deadlines &amp; Reminders
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-rose-500/20 bg-rose-950/20 p-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white">Razorpay — Technical OA</span>
                  <p className="text-[11px] text-slate-400">PostgreSQL &amp; Concurrency assessment</p>
                </div>
                <span className="rounded-md bg-rose-500/20 text-rose-300 font-bold px-2 py-0.5 text-[10px]">
                  🔥 Due in 24 hrs
                </span>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white">Notion — Technical Round</span>
                  <p className="text-[11px] text-slate-400">State management &amp; architecture</p>
                </div>
                <span className="rounded-md bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 text-[10px]">
                  ⏰ In 3 Days
                </span>
              </div>
            </div>
          </div>

          {/* 4-Column Board */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { status: "Wishlist" as const, title: "1. Saved / Wishlist", color: "border-slate-500/30 text-slate-300" },
              { status: "Applied" as const, title: "2. Applied & OA", color: "border-indigo-500/30 text-indigo-300" },
              { status: "Interview" as const, title: "3. Interviewing", color: "border-amber-500/30 text-amber-300" },
              { status: "Offer" as const, title: "4. Offer / Decision", color: "border-emerald-500/30 text-emerald-300" },
            ].map((col) => {
              const cardsInCol = kanbanApps.filter((c) => {
                if (col.status === "Interview") return c.status === "Interview" || c.status === "Phone Screen";
                return c.status === col.status;
              });

              return (
                <div key={col.status} className="rounded-2xl border border-white/10 bg-black/40 p-3.5 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className={clsx("text-xs font-bold", col.color)}>{col.title}</span>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                      {cardsInCol.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 min-h-[160px]">
                    {cardsInCol.length === 0 ? (
                      <div className="h-28 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 text-center p-3">
                        <span className="text-xs text-slate-500">No applications here</span>
                        {col.status === "Wishlist" && (
                          <button
                            type="button"
                            onClick={handleAutoAddTop4Jobs}
                            className="mt-2 text-[11px] text-cyan-400 hover:underline cursor-pointer"
                          >
                            + Auto-Fill Top 4
                          </button>
                        )}
                      </div>
                    ) : (
                      cardsInCol.map((card) => (
                        <div
                          key={card.id}
                          className="rounded-xl border border-white/10 bg-[#0e1224] p-3 space-y-2 shadow-md hover:border-indigo-400/40 transition-all"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-bold text-white truncate">{card.company}</span>
                            <span className="text-[10px] font-bold text-emerald-400">{card.matchScore}%</span>
                          </div>

                          <p className="text-[11px] text-slate-300 truncate">{card.title}</p>
                          <p className="text-[10px] text-slate-400">{card.salary}</p>

                          {/* Quick Stage Mover Controls */}
                          <div className="pt-1.5 border-t border-white/5 flex items-center justify-between gap-1 text-[10px]">
                            {col.status !== "Applied" && (
                              <button
                                type="button"
                                onClick={() => handleMoveKanbanCard(card.id, "Applied")}
                                className="text-indigo-400 hover:text-indigo-300 cursor-pointer"
                              >
                                → Applied
                              </button>
                            )}
                            {col.status !== "Interview" && (
                              <button
                                type="button"
                                onClick={() => handleMoveKanbanCard(card.id, "Interview")}
                                className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer"
                              >
                                → Interview
                              </button>
                            )}
                            {col.status !== "Offer" && (
                              <button
                                type="button"
                                onClick={() => handleMoveKanbanCard(card.id, "Offer")}
                                className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer"
                              >
                                → Offer
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── ZERO CLUTTER WORKSPACE 5: ROLE-SPECIFIC MOCK INTERVIEW ──────── */}
      {activeWorkspace === "interview" && (
        <div className="rounded-3xl border border-purple-500/30 bg-[#120a1d] p-6 shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">🎤 Practice a Quick Mock Interview</h3>
                <p className="text-xs text-slate-400">
                  Role: <span className="text-purple-300 font-semibold">{selectedRole.name}</span> • 3 quick questions with instant AI feedback.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={showAllOptions}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Menu
            </button>
          </div>

          {!interviewFinished ? (
            <div className="space-y-4">
              {/* Question Stepper */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-purple-300 uppercase tracking-wider">
                  Question {currentQuestionIndex + 1} of {questionsForRole.length}
                </span>
                <span className="capitalize text-slate-400">
                  Round: {currentQuestion.type} Deep Dive
                </span>
              </div>

              {/* Question Box */}
              <div className="rounded-2xl border border-purple-500/25 bg-black/40 p-5 space-y-3">
                <h4 className="text-base font-bold text-white leading-relaxed">
                  {currentQuestion.question}
                </h4>
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-3 text-xs text-indigo-300">
                  <span className="font-bold">💡 Helpful Hint: </span>
                  {currentQuestion.hint}
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2.5">
                {currentQuestion.options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={answerSubmitted}
                    onClick={() => setSelectedOptionId(opt.id)}
                    className={clsx(
                      "w-full text-left rounded-2xl border p-4 transition-all cursor-pointer flex items-start gap-3",
                      selectedOptionId === opt.id
                        ? "border-purple-400 bg-purple-950/30 shadow-md"
                        : "border-white/10 bg-black/30 hover:border-purple-500/30",
                      answerSubmitted && opt.isCorrect && "border-emerald-500 bg-emerald-950/30",
                      answerSubmitted && selectedOptionId === opt.id && !opt.isCorrect && "border-rose-500 bg-rose-950/30"
                    )}
                  >
                    <span
                      className={clsx(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold border",
                        selectedOptionId === opt.id
                          ? "bg-purple-500 text-white border-purple-400"
                          : "border-slate-500 text-slate-400"
                      )}
                    >
                      {opt.id}
                    </span>
                    <span className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                      {opt.text}
                    </span>
                  </button>
                ))}
              </div>

              {/* Instant Feedback */}
              {answerSubmitted && (
                <div
                  className={clsx(
                    "rounded-2xl border p-4 space-y-2 transition-all",
                    currentQuestion.options.find((o) => o.id === selectedOptionId)?.isCorrect
                      ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-300"
                      : "border-amber-500/30 bg-amber-950/20 text-amber-300"
                  )}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Sparkles className="h-4 w-4" />
                    <span>Robot Feedback:</span>
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed">
                    {currentQuestion.options.find((o) => o.id === selectedOptionId)?.feedback}
                  </p>
                </div>
              )}

              {/* Submit / Next Button */}
              <div className="flex justify-end gap-3 pt-2">
                {!answerSubmitted ? (
                  <button
                    type="button"
                    disabled={!selectedOptionId}
                    onClick={handleSubmitAnswer}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition-all cursor-pointer"
                  >
                    <span>Submit Answer</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition-all cursor-pointer"
                  >
                    <span>
                      {currentQuestionIndex + 1 < questionsForRole.length ? "Next Question →" : "Finish Practice →"}
                    </span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            // Interview Completion Card
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                <Award className="h-8 w-8" />
              </div>
              <h4 className="text-xl font-bold text-white">Mock Practice Completed!</h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Great job answering role-specific questions for {selectedRole.name}. We&apos;ve added recommended topics to your study plan so you&apos;re 100% prepared.
              </p>

              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => openWorkspace("readiness")}
                  className="rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  📚 View Study Plan
                </button>
                <button
                  type="button"
                  onClick={() => openWorkspace("tracker")}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                >
                  ⏰ View Applications
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
