"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type {
  AgentApprovalRecord,
  AgentRunRecord,
  AgentTraceStep,
  SkillEvidenceItem,
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
  resolveApproval: (approvalId: string, decision: "APPROVED" | "REJECTED") => Promise<any>;
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

  // Backwards-compatible drawer & modal states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeToast, setActiveToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [isBluffAuditModalOpen, setIsBluffAuditModalOpen] = useState(false);
  const [probeSkill, setProbeSkill] = useState<string | null>(null);

  const setTargetRole = useCallback((role: string) => {
    setTargetRoleState(role);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("copilot_selected_target_role", role);
      window.dispatchEvent(new CustomEvent("agent-state-mutated"));
    }
  }, []);

  const clearAgentError = useCallback(() => setAgentError(null), []);

  const refreshAgentState = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/agent/execute", { method: "GET", cache: "no-store" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setAgentError(json.error || `Failed to load agent state (HTTP ${res.status})`);
        return;
      }

      if (json.digitalTwin) {
        setDigitalTwin(json.digitalTwin);
        if (json.digitalTwin.targetRole && !targetRole) {
          setTargetRoleState(json.digitalTwin.targetRole);
        }
      }
      setRuns(Array.isArray(json.runs) ? json.runs : []);
      if (Array.isArray(json.runs) && json.runs.length > 0) {
        setActiveRunState(json.runs[0]);
      }
      setPendingApprovals(Array.isArray(json.pendingApprovals) ? json.pendingApprovals : []);
    } catch (err: any) {
      setAgentError(err?.message || "Network error while syncing with Supabase agent backend.");
    } finally {
      setIsLoading(false);
    }
  }, [targetRole]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRole = window.localStorage.getItem("copilot_selected_target_role");
      const savedParsed = window.localStorage.getItem("copilot_parsed_resume_v2");
      const savedFile = window.localStorage.getItem("copilot_uploaded_filename_v2");
      if (savedRole) setTargetRoleState(savedRole);
      if (savedFile) setUploadedFileName(savedFile);
      if (savedParsed) {
        try {
          setParsedResume(JSON.parse(savedParsed));
        } catch {
          // Ignore corrupt local cache
        }
      }
    }
    refreshAgentState();
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

        setTargetRole(cleanRole);
        setUploadedFileName(file.name);
        setParsedResume(json.parsedResume);

        if (typeof window !== "undefined") {
          window.localStorage.setItem("copilot_parsed_resume_v2", JSON.stringify(json.parsedResume));
          window.localStorage.setItem("copilot_uploaded_filename_v2", file.name);

          // Sync with older storage keys for existing components
          const legacyFormat = {
            fileName: file.name,
            candidateName: json.parsedResume.candidateName || "Candidate",
            targetRole: cleanRole,
            atsScore: json.parsedResume.atsScore || 0,
            skills: (json.parsedResume.extractedSkills || []).map((s: any) => s.name),
            projects: json.parsedResume.projects || [],
            missingRecommendedSkills: (json.parsedResume.missingSkillsForTargetRole || []).map((m: any) => m.skill),
            bulletImprovements: json.parsedResume.bulletImprovements || [],
          };
          window.localStorage.setItem("copilot_real_resume_v1", JSON.stringify(legacyFormat));
          window.dispatchEvent(new CustomEvent("agent-state-mutated"));
          window.dispatchEvent(new CustomEvent("copilot-data-updated"));
        }

        if (json.agentRun) {
          setActiveRunState(json.agentRun);
          if (json.agentRun.status === "FAILED" && json.agentRun.error) {
            setAgentError(json.agentRun.error);
          }
        }

        await refreshAgentState();
        return true;
      } catch (err: any) {
        setAgentError(err?.message || "Unexpected error while uploading PDF resume.");
        return false;
      } finally {
        setIsUploadingResume(false);
      }
    },
    [targetRole, setTargetRole, refreshAgentState]
  );

  const triggerAgent = useCallback(
    async (input: AgentTriggerInput) => {
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
        await refreshAgentState();
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("agent-state-mutated"));
        }
        return json;
      } catch (err: any) {
        const msg = err?.message || "Network failure during agent execution.";
        setAgentError(msg);
        return { status: "FAILED", error: msg };
      } finally {
        setIsExecutingAgent(false);
      }
    },
    [targetRole, parsedResume, refreshAgentState]
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
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("copilot_parsed_resume_v2");
      window.localStorage.removeItem("copilot_uploaded_filename_v2");
      window.localStorage.removeItem("copilot_selected_target_role");
      window.localStorage.removeItem("copilot_real_resume_v1");
      window.localStorage.removeItem("copilot_resume_workspace_v1");
      window.localStorage.removeItem("copilot_applications_v1");
      window.localStorage.removeItem("copilot_readiness_tasks_v1");
      window.localStorage.removeItem("copilot_interview_sessions_v1");
      window.dispatchEvent(new CustomEvent("agent-state-mutated"));
      window.dispatchEvent(new CustomEvent("copilot-data-updated"));
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
