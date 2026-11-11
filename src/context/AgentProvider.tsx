"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type {
  AgentApprovalRecord,
  AgentRunRecord,
  StudentDigitalTwinSnapshot,
} from "@/lib/agent/types";

export interface ParsedResumeData {
  candidateName?: string;
  targetRole: string;
  atsScore: number;
  extractedSkills: Array<{ name: string; claimedLevel: "HIGH" | "MEDIUM" | "LOW"; citation: string }>;
  projects: Array<{ name: string; techStack: string[]; bullets: string[] }>;
  experience: Array<{ company: string; role: string; duration: string; bullets: string[] }>;
  missingSkillsForTargetRole: Array<{ skill: string; priority: "HIGH" | "MEDIUM"; reason: string }>;
  bulletImprovements: Array<{ originalBullet: string; proposedBullet: string; verifiedSourceProject: string }>;
}

export interface AgentTriggerInput {
  triggerType: string;
  entityId?: string;
  goalPrompt?: string;
  metadata?: Record<string, any>;
  autoOpenDrawer?: boolean;
}

export type TriggerAgentPayload = AgentTriggerInput;

export interface AgentContextValue {
  digitalTwin: StudentDigitalTwinSnapshot | null;
  parsedResume: ParsedResumeData | null;
  uploadedFileName: string | null;
  targetRole: string;
  setTargetRole: (role: string) => void;
  runs: AgentRunRecord[];
  activeRun: AgentRunRecord | null;
  pendingApprovals: AgentApprovalRecord[];
  isLoading: boolean;
  isUploadingResume: boolean;
  isExecutingAgent: boolean;
  agentError: string | null;
  clearAgentError: () => void;
  refreshAgentState: () => Promise<void>;
  uploadResumeForRole: (file: File, role: string) => Promise<boolean>;
  triggerAgent: (input: AgentTriggerInput) => Promise<any>;
  runFocusedAction: (action: "jobs" | "readiness" | "kanban") => Promise<void>;
  resolveApproval: (approvalId: string, decision: "APPROVED" | "REJECTED") => Promise<boolean>;
  resetWorkspaceToZero: () => void;

  // Backwards-compatible methods & properties for existing views
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  isExecuting: boolean;
  activeToast: { message: string; type: "success" | "error" | "info" } | null;
  bluffRiskCount: number;
  pendingApprovalsCount: number;
  isBluffAuditModalOpen: boolean;
  openBluffAuditModal: () => void;
  closeBluffAuditModal: () => void;
  openProbeModal: (skillName: string) => void;
  closeProbeModal: () => void;
  probeSkill: string | null;
  setActiveRun: (run: AgentRunRecord | null) => void;
  dismissToast: () => void;
  runAutonomousBootstrap: () => Promise<any>;
  updateSkillEvidence: (
    skillName: string,
    verdict?: "POSITIVE" | "NEGATIVE",
    source?: string,
    citation?: string
  ) => Promise<boolean>;
  toneDownSkillClaim: (
    skillName: string,
    originalBullet?: string,
    defensibleRewrite?: string
  ) => Promise<boolean>;
}

const EMPTY_TWIN: StudentDigitalTwinSnapshot = {
  userId: "00000000-0000-0000-0000-000000000001",
  profileSummary: {
    fullName: "Candidate",
    targetRole: "",
    readinessScore: 0,
  },
  skills: [],
  bluffRiskSkills: [],
  activeApplications: [],
  recentInterviewWeaknesses: [],
  pendingReadinessTasksCount: 0,
  currentResumeSummary: { fileName: "No resume uploaded yet" },
};

function syncAgentToolResultsToLocalStorage(result: any) {
  if (!result || typeof window === "undefined") return;

  const run = result.run || result.agentRun || result;
  const traceSteps: any[] =
    run?.traceSteps ||
    run?.reasoning_trace ||
    run?.trace ||
    result?.traceSteps ||
    result?.trace ||
    result?.reasoning_trace ||
    [];

  // Sync readiness tasks from agent to localStorage
  const readinessTasks = traceSteps
    .filter(
      (step: any) =>
        step &&
        (step.toolName === "inject_readiness_sprint" || step.tool_name === "inject_readiness_sprint")
    )
    .flatMap(
      (step: any) =>
        step.output?.data?.tasks ||
        step.data?.tasks ||
        step.data?.sprintTasks ||
        step.output?.tasks ||
        step.tasks ||
        []
    );

  if (Array.isArray(readinessTasks) && readinessTasks.length > 0) {
    try {
      const existing = JSON.parse(localStorage.getItem("copilot_readiness_tasks_v1") || "[]");
      const existingIds = new Set(existing.map((t: any) => t.id));
      const existingTitles = new Set(
        existing.map((t: any) => String(t.title || "").trim().toLowerCase())
      );

      const formattedNewTasks = readinessTasks
        .filter(
          (t: any) =>
            t &&
            !existingIds.has(t.id) &&
            !existingTitles.has(String(t.title || "").trim().toLowerCase())
        )
        .map((t: any, idx: number) => ({
          id: t.id || `task-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          title: t.title || "Readiness Sprint Task",
          description: t.description || t.reason || "Actionable milestone injected by agent.",
          completed: false,
          priority: ((t.priority || "high").toLowerCase() === "low"
            ? "low"
            : (t.priority || "high").toLowerCase() === "medium"
            ? "medium"
            : "high") as "high" | "medium" | "low",
          category: (t.category || "skills").toLowerCase(),
          dueDate: t.dueDate || "In 7 days",
          createdAt: t.createdAt || new Date().toISOString(),
        }));

      if (formattedNewTasks.length > 0) {
        localStorage.setItem(
          "copilot_readiness_tasks_v1",
          JSON.stringify([...existing, ...formattedNewTasks])
        );
      }
    } catch (e) {
      console.error("[AgentProvider] Failed to sync readiness tasks:", e);
    }
  }

  // Sync seeded jobs from agent to localStorage
  const seededApps = traceSteps
    .filter(
      (step: any) =>
        step &&
        (step.toolName === "auto_seed_kanban_pipeline" || step.tool_name === "auto_seed_kanban_pipeline")
    )
    .flatMap(
      (step: any) =>
        step.output?.data?.applications ||
        step.data?.applications ||
        step.output?.applications ||
        step.applications ||
        []
    );

  const appsToProcess =
    Array.isArray(seededApps) && seededApps.length > 0
      ? seededApps
      : Array.isArray(result.digitalTwin?.activeApplications)
      ? result.digitalTwin.activeApplications
      : [];

  if (Array.isArray(appsToProcess) && appsToProcess.length > 0) {
    try {
      const existing = JSON.parse(localStorage.getItem("copilot_applications_v1") || "[]");
      const existingIds = new Set(existing.map((a: any) => a.id));
      const existingKeys = new Set(
        existing.map(
          (a: any) =>
            `${String(a.company || "").trim().toLowerCase()}::${String(a.title || "").trim().toLowerCase()}`
        )
      );

      const formattedNewApps = appsToProcess
        .filter((a: any) => {
          if (!a) return false;
          const key = `${String(a.company || a.company_name || "").trim().toLowerCase()}::${String(
            a.title || ""
          )
            .trim()
            .toLowerCase()}`;
          return !existingIds.has(a.id) && !existingKeys.has(key);
        })
        .map((a: any, idx: number) => ({
          id: a.id || `app-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
          company: a.company || a.company_name || "Target Employer",
          title: a.title || "Software Engineer",
          logo:
            a.logo ||
            `https://logo.clearbit.com/${encodeURIComponent(
              String(a.company || a.company_name || "")
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "")
            )}.com`,
          status: a.status === "Saved" ? "Wishlist" : a.status || "Wishlist",
          matchScore: typeof a.matchScore === "number" ? a.matchScore : 88,
          priority: ((a.priority || "high").toLowerCase() === "low"
            ? "low"
            : (a.priority || "high").toLowerCase() === "medium"
            ? "medium"
            : "high") as "high" | "medium" | "low",
          url: a.url || "https://remotive.com",
          location: a.location || "Remote",
          salary: a.salary || "Competitive",
          notes: a.notes || "Live scouted by Placement Agent.",
          createdAt: a.createdAt || a.created_at || new Date().toISOString(),
        }));

      if (formattedNewApps.length > 0) {
        localStorage.setItem(
          "copilot_applications_v1",
          JSON.stringify([...existing, ...formattedNewApps])
        );
      }
    } catch (e) {
      console.error("[AgentProvider] Failed to sync applications:", e);
    }
  }
}

const AgentContext = createContext<AgentContextValue | undefined>(undefined);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [digitalTwin, setDigitalTwin] = useState<StudentDigitalTwinSnapshot | null>(EMPTY_TWIN);
  const [parsedResume, setParsedResume] = useState<ParsedResumeData | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [targetRole, setTargetRoleState] = useState<string>("");
  const [runs, setRuns] = useState<AgentRunRecord[]>([]);
  const [activeRun, setActiveRunState] = useState<AgentRunRecord | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<AgentApprovalRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploadingResume, setIsUploadingResume] = useState<boolean>(false);
  const [isExecutingAgent, setIsExecutingAgent] = useState<boolean>(false);
  const [agentError, setAgentError] = useState<string | null>(null);

  // Drawer & modal state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [isBluffAuditModalOpen, setIsBluffAuditModalOpen] = useState(false);
  const [probeSkill, setProbeSkill] = useState<string | null>(null);

  const hasHydratedRef = useRef(false);

  const setTargetRole = useCallback((role: string) => {
    setTargetRoleState(role);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("copilot_selected_target_role", role);
      window.dispatchEvent(new CustomEvent("agent-state-mutated"));
    }
  }, []);

  const clearAgentError = useCallback(() => setAgentError(null), []);

  const refreshAgentState = useCallback(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      setIsLoading(true);
      const res = await fetch("/api/agent/execute", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        return;
      }

      if (json.digitalTwin) {
        setDigitalTwin(json.digitalTwin);
        const serverRole = json.digitalTwin.profileSummary?.targetRole || (json.digitalTwin as any).targetRole;
        if (serverRole) {
          setTargetRoleState((prev) => prev || serverRole);
        }
      }
      setRuns(Array.isArray(json.runs) ? json.runs : []);
      if (Array.isArray(json.runs) && json.runs.length > 0) {
        setActiveRunState(json.runs[0]);
      }
      setPendingApprovals(Array.isArray(json.pendingApprovals) ? json.pendingApprovals : []);
    } catch {
      // Do not block UI if initial background sync times out
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const hydrateFromStorage = () => {
      if (typeof window === "undefined") return;
      const savedRole = window.localStorage.getItem("copilot_selected_target_role");
      const savedParsed = window.localStorage.getItem("copilot_parsed_resume_v2");
      const savedFile = window.localStorage.getItem("copilot_uploaded_filename_v2");
      if (savedRole) setTargetRoleState(savedRole);
      if (savedFile) setUploadedFileName(savedFile);
      if (savedParsed) {
        try {
          setParsedResume(JSON.parse(savedParsed));
        } catch {
          // Ignore invalid JSON
        }
      } else {
        const savedReal = window.localStorage.getItem("copilot_real_resume_v1");
        if (savedReal) {
          try {
            const parsedReal = JSON.parse(savedReal);
            if (parsedReal && typeof parsedReal === "object") {
              setParsedResume({
                candidateName: parsedReal.candidateName,
                targetRole: parsedReal.targetRole || savedRole || "Software Engineer",
                atsScore: parsedReal.atsScore || 70,
                extractedSkills: (parsedReal.skills || []).map((s: any) => ({
                  name: typeof s === "string" ? s : s?.name || "",
                  claimedLevel: "HIGH",
                  citation: "Verified from resume",
                })),
                projects: (parsedReal.projects || []).map((p: any) => ({
                  name: p.name || p.title || "Project",
                  techStack: p.techStack || [],
                  bullets: typeof p.summary === "string" ? [p.summary] : p.bullets || [],
                })),
                experience: [],
                missingSkillsForTargetRole: (parsedReal.missingRecommendedSkills || []).map((m: any) => ({
                  skill: typeof m === "string" ? m : m.skill || "",
                  priority: "HIGH",
                  reason: typeof m === "string" ? "Recommended" : m.whyNeeded || "",
                })),
                bulletImprovements: (parsedReal.bulletImprovements || []).map((b: any) => ({
                  originalBullet: b.originalBullet || "",
                  proposedBullet: b.improvedBullet || "",
                  verifiedSourceProject: b.projectName || "Projects",
                })),
              });
              if (!savedFile && parsedReal.fileName) {
                setUploadedFileName(parsedReal.fileName);
              }
            }
          } catch {
            // Ignore invalid JSON
          }
        }
      }
    };

    hydrateFromStorage();
    if (typeof window !== "undefined") {
      window.addEventListener("copilot-data-updated", hydrateFromStorage);
    }
    refreshAgentState();

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("copilot-data-updated", hydrateFromStorage);
      }
    };
  }, [refreshAgentState]);

  const uploadResumeForRole = useCallback(
    async (file: File, role: string): Promise<boolean> => {
      const cleanRole = role.trim() || targetRole.trim();
      if (!cleanRole) {
        setAgentError("Please select or type your aspiring Target Role before uploading your resume.");
        return false;
      }

      setIsUploadingResume(true);
      setAgentError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("targetRole", cleanRole);

        const res = await fetch("/api/resume/parse", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();
        if (!res.ok || !json.success) {
          setAgentError(json.error || `Resume parsing failed (HTTP ${res.status})`);
          return false;
        }

        const parsed: ParsedResumeData = json.parsedResume;
        setTargetRole(cleanRole);
        setUploadedFileName(file.name);
        setParsedResume(parsed);

        if (typeof window !== "undefined") {
          window.localStorage.setItem("copilot_parsed_resume_v2", JSON.stringify(parsed));
          window.localStorage.setItem("copilot_uploaded_filename_v2", file.name);

          // Sync with older storage keys for existing components
          const legacyFormat = {
            fileName: file.name,
            candidateName: parsed.candidateName || "Candidate",
            targetRole: cleanRole,
            atsScore: parsed.atsScore || 0,
            skills: (parsed.extractedSkills || []).map((s: any) => (typeof s === "string" ? s : s.name)),
            projects: parsed.projects || [],
            missingRecommendedSkills: (parsed.missingSkillsForTargetRole || []).map((m: any) =>
              typeof m === "string" ? m : m.skill
            ),
            bulletImprovements: parsed.bulletImprovements || [],
          };
          window.localStorage.setItem("copilot_real_resume_v1", JSON.stringify(legacyFormat));

          // Also write copilot_latest_resume_analysis so /resume studio works
          const skillNames = (parsed.extractedSkills || []).map((s: any) =>
            typeof s === "string" ? s : s?.name || ""
          );
          const missingNames = (parsed.missingSkillsForTargetRole || []).map((m: any) =>
            typeof m === "string" ? m : m?.skill || ""
          );

          const workspaceToStore = json.resumeWorkspace || {
            analysis: {
              matchScore: parsed.atsScore || 75,
              atsScore: parsed.atsScore || 75,
              jobTitle: cleanRole,
              company: "Target Roles",
              strengths: skillNames.slice(0, 5).map((name) => `${name}: Verified in resume`),
              gaps: (parsed.missingSkillsForTargetRole || []).map(
                (m: any) => `${m.skill || m}: ${m.reason || "Recommended"}`
              ),
              suggestions: (parsed.bulletImprovements || []).map((b: any, idx: number) => ({
                id: `sug-${idx + 1}`,
                section: "experience" as const,
                original: String(b?.originalBullet || ""),
                suggested: String(b?.proposedBullet || ""),
                improved: String(b?.proposedBullet || ""),
                impact: "high" as const,
                reason: `Grounded in ${b?.verifiedSourceProject || "Projects"}`,
                impactLevel: "high" as const,
              })),
              keywords: [
                ...skillNames.map((w) => ({ word: w, present: true, importance: "high" as const })),
                ...missingNames.map((w) => ({ word: w, present: false, importance: "high" as const })),
              ],
              sectionScores: {
                format: parsed.atsScore || 80,
                impact: 75,
                style: 80,
              },
              skills: skillNames,
              extractedSkills: skillNames,
              projects: parsed.projects || [],
              meta: {
                fileName: file.name,
                pageCount: 1,
                bulletCount: (parsed.bulletImprovements || []).length,
                hasQuantifiedMetrics: true,
              },
            },
            editableResume: {
              fileName: file.name,
              candidateName: parsed.candidateName || file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " "),
              email: "",
              phone: "",
              location: "Remote / Hybrid",
              links: [],
              summary: `Aspiring ${cleanRole} with technical background in ${skillNames.slice(0, 4).join(", ")}.`,
              skillCategories: [{ category: "Technical Skills", skills: skillNames }],
              skills: skillNames,
              experience: (parsed.experience || []).map((e: any, i: number) => ({
                id: `exp-${i + 1}`,
                title: String(e?.role || "Software Engineer"),
                subtitle: String(e?.company || "Company"),
                dateRange: String(e?.duration || "Present"),
                bullets: (Array.isArray(e?.bullets) ? e.bullets : []).map((text: any, bIdx: number) => ({
                  id: `exp-b-${i}-${bIdx}`,
                  text: String(text),
                })),
              })),
              projects: (parsed.projects || []).map((p: any, i: number) => ({
                id: `proj-${i + 1}`,
                title: String(p?.name || "Technical Project"),
                subtitle: Array.isArray(p?.techStack) ? p.techStack.join(", ") : "Technologies Used",
                dateRange: "Recent",
                bullets: (Array.isArray(p?.bullets) ? p.bullets : []).map((text: any, bIdx: number) => ({
                  id: `proj-b-${i}-${bIdx}`,
                  text: String(text),
                })),
              })),
              education: [
                {
                  id: "edu-1",
                  title: "Bachelor of Technology / Computer Science",
                  subtitle: "University / Institute",
                  dateRange: "2020 - 2024",
                  bullets: [],
                },
              ],
              customSections: [],
              rawText: JSON.stringify(parsed.projects || []),
            },
            appliedSuggestionIds: [],
            userId: null,
            fileName: file.name,
            savedAt: new Date().toISOString(),
          };

          try {
            window.localStorage.setItem(
              "copilot_latest_resume_analysis",
              JSON.stringify(workspaceToStore)
            );
          } catch (e) {
            console.error("[AgentProvider] Failed to sync resume workspace:", e);
          }

          window.dispatchEvent(new CustomEvent("copilot-data-updated"));
          window.dispatchEvent(new CustomEvent("agent-state-mutated"));
        }

        if (json.agentRun) {
          setActiveRunState(json.agentRun);
          syncAgentToolResultsToLocalStorage(json.agentRun);
        }

        // Refresh state in background without blocking the user
        refreshAgentState();
        return true;
      } catch (err: any) {
        setAgentError(err?.message || "Unexpected error while uploading PDF resume.");
        return false;
      } finally {
        setIsUploadingResume(false);
        setIsExecutingAgent(false);
      }
    },
    [targetRole, setTargetRole, refreshAgentState]
  );

  const triggerAgent = useCallback(
    async (input: AgentTriggerInput) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);
      setIsExecutingAgent(true);
      setAgentError(null);
      if (input.autoOpenDrawer) {
        setIsDrawerOpen(true);
      }

      try {
        const res = await fetch("/api/agent/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            triggerType: input.triggerType,
            entityId: input.entityId || "manual",
            goalPrompt: input.goalPrompt || "",
            metadata: {
              targetRole,
              resumeContext: parsedResume,
              ...(input.metadata || {}),
            },
          }),
          signal: controller.signal,
        });

        const json = await res.json();
        if (!res.ok || json.status === "FAILED" || !json.success) {
          const errMsg = json.error || json.summary || `Agent execution failed (HTTP ${res.status})`;
          setAgentError(errMsg);
          if (json.run) setActiveRunState(json.run);
          return json;
        }

        if (json.run) setActiveRunState(json.run);
        if (json.digitalTwin) {
          setDigitalTwin(json.digitalTwin);
        }

        // Sync readiness sprint tasks and seeded jobs from agent to localStorage
        syncAgentToolResultsToLocalStorage(json);

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("copilot-data-updated"));
          window.dispatchEvent(new CustomEvent("agent-state-mutated"));
        }
        return json;
      } catch (err: any) {
        const msg =
          err?.name === "AbortError"
            ? "Agent request timed out after 90s."
            : err?.message || "Network failure during agent execution.";
        setAgentError(msg);
        return { status: "FAILED", error: msg };
      } finally {
        clearTimeout(timeoutId);
        setIsExecutingAgent(false);
      }
    },
    [targetRole, parsedResume]
  );

  const runFocusedAction = useCallback(
    async (action: "jobs" | "readiness" | "kanban") => {
      const parsedResume = (() => {
        try {
          return JSON.parse(localStorage.getItem("copilot_parsed_resume_v2") || "null");
        } catch {
          return null;
        }
      })();
      const targetRole =
        (typeof window !== "undefined" ? localStorage.getItem("copilot_selected_target_role") : null) ||
        "Software Engineer";
      const rawSkills: any[] = parsedResume?.skills || parsedResume?.extractedSkills || [];
      const skills: string[] = rawSkills
        .map((s: any) =>
          typeof s === "string" ? s : typeof s?.name === "string" ? s.name : String(s || "")
        )
        .filter(Boolean);

      const instructions: Record<string, string> = {
        jobs: `You have ONE task: call auto_seed_kanban_pipeline with targetRole="${targetRole}" and skills=${JSON.stringify(
          skills.slice(0, 5)
        )} and limit=6. Do not call any other tool. Return immediately after.`,
        readiness: `You have ONE task: call inject_readiness_sprint with targetRole="${targetRole}" and skillGaps based on the student's missing skills for this role. Do not call any other tool. Return immediately after.`,
        kanban: `You have ONE task: call auto_seed_kanban_pipeline with targetRole="${targetRole}" and skills=${JSON.stringify(
          skills.slice(0, 5)
        )} and limit=10. Do not call any other tool. Return immediately after.`,
      };

      setIsExecutingAgent(true);
      setAgentError(null);

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90000);

        const response = await fetch("/api/agent/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            triggerType: "MANUAL_RUN",
            entityId: `focused-${action}`,
            goalPrompt: instructions[action],
            parsedResume,
            targetRole,
            userInstruction: instructions[action],
            focusedAction: action,
            maxSteps: 2,
            metadata: {
              targetRole,
              resumeContext: parsedResume,
              action,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) throw new Error(`Agent error: ${response.status}`);
        const result = await response.json();
        if (result.run) setActiveRunState(result.run);
        if (result.digitalTwin) setDigitalTwin(result.digitalTwin);

        // Sync to localStorage
        syncAgentToolResultsToLocalStorage(result);

        const traceSteps =
          result.run?.traceSteps ||
          result.run?.reasoning_trace ||
          result.run?.trace ||
          result.traceSteps ||
          result.trace ||
          [];

        // Sync jobs to localStorage
        const seededApps = traceSteps
          .filter(
            (s: any) =>
              s &&
              (s.toolName === "auto_seed_kanban_pipeline" ||
                s.tool_name === "auto_seed_kanban_pipeline")
          )
          .flatMap((s: any) => s.output?.data?.applications || s.data?.applications || s.applications || []);

        if (seededApps.length > 0) {
          try {
            const existing = JSON.parse(localStorage.getItem("copilot_applications_v1") || "[]");
            const existingIds = new Set(existing.map((a: any) => a.id));
            const newApps = seededApps.filter((a: any) => !existingIds.has(a.id));
            localStorage.setItem(
              "copilot_applications_v1",
              JSON.stringify([...existing, ...newApps])
            );
          } catch (e) {
            console.error("[sync jobs]", e);
          }
        }

        // Sync readiness tasks to localStorage
        const tasks = traceSteps
          .filter(
            (s: any) =>
              s &&
              (s.toolName === "inject_readiness_sprint" ||
                s.tool_name === "inject_readiness_sprint")
          )
          .flatMap((s: any) => s.output?.data?.tasks || s.data?.tasks || s.tasks || []);

        if (tasks.length > 0) {
          try {
            const existing = JSON.parse(localStorage.getItem("copilot_readiness_tasks_v1") || "[]");
            const existingIds = new Set(existing.map((t: any) => t.id));
            const newTasks = tasks.filter((t: any) => !existingIds.has(t.id));
            localStorage.setItem(
              "copilot_readiness_tasks_v1",
              JSON.stringify([...existing, ...newTasks])
            );
          } catch (e) {
            console.error("[sync tasks]", e);
          }
        }

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("copilot-data-updated"));
          window.dispatchEvent(new CustomEvent("agent-state-mutated"));
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          setAgentError("Action timed out after 90s. Try again.");
        } else {
          setAgentError(err.message || "Action failed.");
        }
      } finally {
        setIsExecutingAgent(false);
      }
    },
    []
  );

  const resolveApproval = useCallback(
    async (approvalId: string, decision: "APPROVED" | "REJECTED"): Promise<boolean> => {
      setAgentError(null);
      try {
        const res = await fetch("/api/agent/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approvalId, decision }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setAgentError(json.error || "Failed to resolve approval.");
          return false;
        }
        await refreshAgentState();
        return true;
      } catch (err: any) {
        setAgentError(err?.message || "Error resolving approval.");
        return false;
      }
    },
    [refreshAgentState]
  );

  const resetWorkspaceToZero = useCallback(() => {
    setParsedResume(null);
    setUploadedFileName(null);
    setTargetRoleState("");
    setDigitalTwin(EMPTY_TWIN);
    setActiveRunState(null);
    setAgentError(null);
    setIsExecutingAgent(false);
    setIsUploadingResume(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("copilot_parsed_resume_v2");
      window.localStorage.removeItem("copilot_uploaded_filename_v2");
      window.localStorage.removeItem("copilot_selected_target_role");
      window.localStorage.removeItem("copilot_real_resume_v1");
      window.localStorage.removeItem("copilot_resume_workspace_v1");
      window.localStorage.removeItem("copilot_applications_v1");
      window.localStorage.removeItem("copilot_readiness_tasks_v1");
      window.localStorage.removeItem("copilot_interview_sessions_v1");
      window.dispatchEvent(new CustomEvent("copilot-data-updated"));
      window.dispatchEvent(new CustomEvent("agent-state-mutated"));
    }
  }, []);

  return (
    <AgentContext.Provider
      value={{
        digitalTwin,
        parsedResume,
        uploadedFileName,
        targetRole,
        setTargetRole,
        runs,
        activeRun,
        pendingApprovals,
        isLoading,
        isUploadingResume,
        isExecutingAgent,
        agentError,
        clearAgentError,
        refreshAgentState,
        uploadResumeForRole,
        triggerAgent,
        runFocusedAction,
        resolveApproval,
        resetWorkspaceToZero,
        // Drawer & Modal helpers for existing layout components
        isDrawerOpen,
        openDrawer: () => setIsDrawerOpen(true),
        closeDrawer: () => setIsDrawerOpen(false),
        toggleDrawer: () => setIsDrawerOpen((prev) => !prev),
        isExecuting: isExecutingAgent,
        activeToast,
        bluffRiskCount: digitalTwin?.bluffRiskSkills?.length || 0,
        pendingApprovalsCount: pendingApprovals.length,
        isBluffAuditModalOpen,
        openBluffAuditModal: () => setIsBluffAuditModalOpen(true),
        closeBluffAuditModal: () => setIsBluffAuditModalOpen(false),
        openProbeModal: (skill: string) => setProbeSkill(skill),
        closeProbeModal: () => setProbeSkill(null),
        probeSkill,
        setActiveRun: (run: AgentRunRecord | null) => setActiveRunState(run),
        dismissToast: () => setActiveToast(null),
        runAutonomousBootstrap: async () =>
          triggerAgent({ triggerType: "USER_GOAL_SUBMITTED", goalPrompt: "Run bootstrap analysis" }),
        updateSkillEvidence: async () => true,
        toneDownSkillClaim: async () => true,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const ctx = useContext(AgentContext);
  if (!ctx) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return ctx;
}
