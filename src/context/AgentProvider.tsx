"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import type {
  StudentDigitalTwinSnapshot,
  AgentRunRecord,
  AgentApprovalRecord,
  AgentTriggerType,
  AgentTraceStep,
} from "@/lib/agent/types";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import SkillMicroProbeModal from "@/components/agent/SkillMicroProbeModal";
import BluffRiskAuditModal from "@/components/agent/BluffRiskAuditModal";

export interface TriggerAgentPayload {
  triggerType: AgentTriggerType;
  entityId?: string;
  goalPrompt?: string;
  metadata?: Record<string, any>;
  autoOpenDrawer?: boolean;
}

export interface AgentContextValue {
  digitalTwin: StudentDigitalTwinSnapshot | null;
  runs: AgentRunRecord[];
  activeRun: AgentRunRecord | null;
  pendingApprovals: AgentApprovalRecord[];
  isDrawerOpen: boolean;
  isExecuting: boolean;
  activeToast: { message: string; type: "success" | "error" | "info" } | null;
  bluffRiskCount: number;
  pendingApprovalsCount: number;
  isBluffAuditModalOpen: boolean;
  probeSkill: string | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  openBluffAuditModal: () => void;
  closeBluffAuditModal: () => void;
  openProbeModal: (skillName: string) => void;
  closeProbeModal: () => void;
  setActiveRun: (run: AgentRunRecord | null) => void;
  dismissToast: () => void;
  refreshAgentState: () => Promise<void>;
  triggerAgent: (payload: TriggerAgentPayload) => Promise<AgentRunRecord | null>;
  runAutonomousBootstrap: () => Promise<AgentRunRecord | null>;
  resolveApproval: (
    approvalId: string,
    decision: "APPROVED" | "REJECTED"
  ) => Promise<{ success: boolean; message: string }>;
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

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [digitalTwin, setDigitalTwin] = useState<StudentDigitalTwinSnapshot | null>(null);
  const [runs, setRuns] = useState<AgentRunRecord[]>([]);
  const [activeRun, setActiveRun] = useState<AgentRunRecord | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<AgentApprovalRecord[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeToast, setActiveToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [isBluffAuditModalOpen, setIsBluffAuditModalOpen] = useState(false);
  const [probeSkill, setProbeSkill] = useState<string | null>(null);
  const lastStateVersionRef = useRef<string>("0");
  const hasInitialHydratedRef = useRef<boolean>(false);
  const isFetchingStateRef = useRef<boolean>(false);
  const mutationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openBluffAuditModal = useCallback(() => setIsBluffAuditModalOpen(true), []);
  const closeBluffAuditModal = useCallback(() => setIsBluffAuditModalOpen(false), []);
  const openProbeModal = useCallback((skillName: string) => setProbeSkill(skillName), []);
  const closeProbeModal = useCallback(() => setProbeSkill(null), []);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      setActiveToast({ message, type });
      setTimeout(() => {
        setActiveToast((current) => (current?.message === message ? null : current));
      }, 5000);
    },
    []
  );

  const dismissToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);
  const toggleDrawer = useCallback(() => setIsDrawerOpen((prev) => !prev), []);

  // ─── HYDRATE STATE FROM /api/agent/twin ────────────────────────────────────
  const refreshAgentState = useCallback(async () => {
    if (isFetchingStateRef.current) return;
    isFetchingStateRef.current = true;
    try {
      const res = await fetch("/api/agent/twin", { cache: "no-store" });
      if (!res.ok) return;

      const version = res.headers.get("X-Agent-State-Version");
      if (version && version !== lastStateVersionRef.current) {
        lastStateVersionRef.current = version;
        // version changed — the data we just fetched is already the new data, so just set it
      }

      const data = await res.json();
      if (data.success) {
        if (data.digitalTwin) {
          setDigitalTwin((prevTwin) => {
            const incomingSkillsCount = Array.isArray(data.digitalTwin.skills)
              ? data.digitalTwin.skills.length
              : 0;
            const prevSkillsCount = Array.isArray(prevTwin?.skills)
              ? prevTwin.skills.length
              : 0;

            // Preserve populated skills in guest/localStorage mode if backend returns an empty baseline
            if (incomingSkillsCount === 0 && prevSkillsCount > 0) {
              return prevTwin;
            }
            return data.digitalTwin;
          });
        }
        if (Array.isArray(data.runs)) {
          setRuns(data.runs);
          // Set activeRun to latest if not currently executing
          setActiveRun((prev) => {
            if (prev?.status === "RUNNING") return prev;
            return data.runs[0] || null;
          });
        }
        if (Array.isArray(data.pendingApprovals)) {
          setPendingApprovals(data.pendingApprovals);
        }
      }
    } catch (err) {
      console.warn("[AgentProvider] Failed to hydrate twin context:", err);
    } finally {
      isFetchingStateRef.current = false;
    }
  }, []);

  // Initial mount hydration (runs once cleanly without re-triggering on every render)
  useEffect(() => {
    if (!hasInitialHydratedRef.current) {
      hasInitialHydratedRef.current = true;
      void refreshAgentState();
    }

    // Listen for cross-module agent mutations (debounced to coalesce dual dispatches)
    const handleMutation = () => {
      if (mutationDebounceRef.current) {
        clearTimeout(mutationDebounceRef.current);
      }
      mutationDebounceRef.current = setTimeout(() => {
        mutationDebounceRef.current = null;
        void refreshAgentState();
      }, 250);
    };

    window.addEventListener("agent-state-mutated", handleMutation);
    window.addEventListener("copilot-data-updated", handleMutation);

    return () => {
      if (mutationDebounceRef.current) {
        clearTimeout(mutationDebounceRef.current);
        mutationDebounceRef.current = null;
      }
      window.removeEventListener("agent-state-mutated", handleMutation);
      window.removeEventListener("copilot-data-updated", handleMutation);
    };
  }, [refreshAgentState]);

  // ─── SUPABASE REALTIME SUBSCRIPTION (LIVE MODE) ───────────────────────────
  useEffect(() => {
    if (!isSupabaseConfigured() || typeof window === "undefined") return;

    try {
      const supabase = createClient();
      const channel = supabase
        .channel("agent-realtime-sync")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "agent_runs" },
          () => {
            refreshAgentState();
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "agent_approvals" },
          () => {
            refreshAgentState();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Ignored for guest/demo mode
    }
  }, [refreshAgentState]);

  // ─── TRIGGER AGENT EXECUTION ──────────────────────────────────────────────
  const triggerAgent = useCallback(
    async (payload: TriggerAgentPayload): Promise<AgentRunRecord | null> => {
      const {
        triggerType,
        entityId = "user-initiative",
        goalPrompt = "Analyze career digital twin and execute high-leverage placement roadmap.",
        metadata = {},
        autoOpenDrawer = true,
      } = payload;

      if (autoOpenDrawer) {
        setIsDrawerOpen(true);
      }
      setIsExecuting(true);

      // Create an optimistic active run to give instant tactile feedback
      const optimisticId = `run-opt-${Date.now()}`;
      const optimisticStep: AgentTraceStep = {
        step_number: 0,
        timestamp: new Date().toISOString(),
        tool_name: "get_student_twin_context",
        input_summary: `Initializing autonomous loop for trigger: ${triggerType}`,
        output_summary: "Gathering student career digital twin snapshot...",
        status: "SUCCESS",
        latency_ms: 12,
      };

      const optimisticRun: AgentRunRecord = {
        id: optimisticId,
        user_id: "current-user",
        idempotency_key: `key-${Date.now()}`,
        trigger_type: triggerType,
        entity_id: entityId,
        goal: goalPrompt,
        status: "RUNNING",
        reasoning_trace: [optimisticStep],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setActiveRun(optimisticRun);

      try {
        const res = await fetch("/api/agent/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            triggerType,
            entityId,
            goalPrompt,
            metadata,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Execution failed with status ${res.status}`);
        }

        const data = await res.json();
        const returnedRun: AgentRunRecord = data.run;

        setActiveRun(returnedRun);
        setRuns((prev) => {
          const filtered = prev.filter((r) => r.id !== returnedRun.id);
          return [returnedRun, ...filtered];
        });

        // Trigger platform-wide update events
        window.dispatchEvent(
          new CustomEvent("agent-state-mutated", { detail: { run: returnedRun } })
        );
        window.dispatchEvent(
          new CustomEvent("copilot-data-updated", { detail: { source: "agent-execution" } })
        );

        // Re-hydrate twin & pending approvals
        await refreshAgentState();

        showToast(
          returnedRun.status === "AWAITING_APPROVAL"
            ? "Agent finished execution: Human Approval required for resume changes!"
            : "Agent execution completed successfully!",
          returnedRun.status === "AWAITING_APPROVAL" ? "info" : "success"
        );

        return returnedRun;
      } catch (err: any) {
        console.error("[AgentProvider] Agent execution error:", err);
        showToast(err.message || "Agent execution encountered an error", "error");

        setActiveRun((current) =>
          current
            ? {
                ...current,
                status: "FAILED",
                final_summary: `Error: ${err.message || "Failed to complete loop"}`,
              }
            : null
        );
        return null;
      } finally {
        setIsExecuting(false);
      }
    },
    [refreshAgentState, showToast]
  );

  // ─── RESOLVE PENDING APPROVAL (HUMAN-IN-THE-LOOP) ──────────────────────────
  const resolveApproval = useCallback(
    async (
      approvalId: string,
      decision: "APPROVED" | "REJECTED"
    ): Promise<{ success: boolean; message: string }> => {
      try {
        const res = await fetch("/api/agent/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approvalId, decision }),
        });

        const version = res.headers.get("X-Agent-State-Version");
        if (version && version !== lastStateVersionRef.current) {
          lastStateVersionRef.current = version;
          refreshAgentState();
        }

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to resolve approval");
        }

        // Optimistically remove from pending list
        setPendingApprovals((prev) => prev.filter((a) => a.id !== approvalId));

        // Re-hydrate full state
        await refreshAgentState();

        // Broadcast updates across pages
        window.dispatchEvent(
          new CustomEvent("agent-state-mutated", { detail: { approvalId, decision } })
        );
        window.dispatchEvent(
          new CustomEvent("copilot-data-updated", { detail: { source: "approval-resolution" } })
        );

        showToast(
          decision === "APPROVED"
            ? "Approved! Changes successfully committed to your resume."
            : "Approval rejected. Master resume remains untouched.",
          decision === "APPROVED" ? "success" : "info"
        );

        return {
          success: true,
          message:
            data.message ||
            (decision === "APPROVED"
              ? "Diff committed to master resume."
              : "Diff proposal rejected."),
        };
      } catch (err: any) {
        console.error("[AgentProvider] Approval resolution error:", err);
        showToast(err.message || "Failed to resolve approval", "error");
        return { success: false, message: err.message || "Failed to resolve approval" };
      }
    },
    [refreshAgentState, showToast]
  );

  // ─── UPDATE SKILL EVIDENCE (60-SEC ADVERSARIAL DRILL) ──────────────────────
  const updateSkillEvidence = useCallback(
    async (
      skillName: string,
      verdict: "POSITIVE" | "NEGATIVE" = "POSITIVE",
      source: string = "READINESS_DRILL",
      citation?: string
    ): Promise<boolean> => {
      try {
        const res = await fetch("/api/agent/evidence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "UPDATE_EVIDENCE",
            skillName,
            verdict,
            source,
            evidenceCitation: citation || `Cleared 60-sec Adversarial Micro-Probe on ${skillName}`,
          }),
        });

        const version = res.headers.get("X-Agent-State-Version");
        if (version && version !== lastStateVersionRef.current) {
          lastStateVersionRef.current = version;
          refreshAgentState();
        }

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to calibrate skill evidence");
        }

        if (data.digitalTwin) {
          setDigitalTwin(data.digitalTwin);
        }

        await refreshAgentState();

        window.dispatchEvent(
          new CustomEvent("agent-state-mutated", { detail: { skillName, verdict } })
        );
        window.dispatchEvent(
          new CustomEvent("copilot-data-updated", { detail: { source: "evidence-update" } })
        );

        showToast(
          `🎉 Competency verified for ${skillName}! Promoted +1 tier on Damped Ladder.`,
          "success"
        );
        return true;
      } catch (err: any) {
        console.error("[AgentProvider] updateSkillEvidence error:", err);
        showToast(err.message || "Failed to update skill evidence", "error");
        return false;
      }
    },
    [refreshAgentState, showToast]
  );

  // ─── TONE DOWN BLUFF RISK CLAIM (AUTO-STAGE DEFENSIBLE REWRITE) ─────────────
  const toneDownSkillClaim = useCallback(
    async (
      skillName: string,
      originalBullet?: string,
      defensibleRewrite?: string
    ): Promise<boolean> => {
      try {
        const res = await fetch("/api/agent/evidence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "TONE_DOWN_CLAIM",
            skillName,
            originalBullet,
            defensibleRewrite,
          }),
        });

        const version = res.headers.get("X-Agent-State-Version");
        if (version && version !== lastStateVersionRef.current) {
          lastStateVersionRef.current = version;
          refreshAgentState();
        }

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to tone down resume claim");
        }

        if (data.digitalTwin) {
          setDigitalTwin(data.digitalTwin);
        }

        await refreshAgentState();

        window.dispatchEvent(
          new CustomEvent("agent-state-mutated", { detail: { skillName, action: "TONE_DOWN" } })
        );
        window.dispatchEvent(
          new CustomEvent("copilot-data-updated", { detail: { source: "claim-recalibration" } })
        );

        showToast(
          `🛡️ Recalibrated "${skillName}" to defensible Working Knowledge! Bluff risk cleared.`,
          "success"
        );
        return true;
      } catch (err: any) {
        console.error("[AgentProvider] toneDownSkillClaim error:", err);
        showToast(err.message || "Failed to recalibrate claim", "error");
        return false;
      }
    },
    [refreshAgentState, showToast]
  );

  // ─── RUN FULL-APP AUTONOMOUS BOOTSTRAP ─────────────────────────────────────
  const runAutonomousBootstrap = useCallback(async (): Promise<AgentRunRecord | null> => {
    return triggerAgent({
      triggerType: "RESUME_UPLOADED_BOOTSTRAP",
      entityId: "bootstrap-manual",
      goalPrompt:
        "Execute 4-Step Full-App Autonomous Bootstrap Chain: calibrate Career Digital Twin from resume, inject 4-milestone readiness sprint, seed 4 high-match Kanban applications, and stage project-grounded resume diff.",
      autoOpenDrawer: true,
    });
  }, [triggerAgent]);

  const bluffRiskCount = useMemo(() => {
    return (
      digitalTwin?.bluffRiskSkills?.length ||
      digitalTwin?.skills?.filter((s) => s.bluff_risk)?.length ||
      0
    );
  }, [digitalTwin]);

  const pendingApprovalsCount = useMemo(() => {
    return pendingApprovals.length;
  }, [pendingApprovals]);

  const contextValue: AgentContextValue = useMemo(
    () => ({
      digitalTwin,
      runs,
      activeRun,
      pendingApprovals,
      isDrawerOpen,
      isExecuting,
      activeToast,
      bluffRiskCount,
      pendingApprovalsCount,
      isBluffAuditModalOpen,
      probeSkill,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      openBluffAuditModal,
      closeBluffAuditModal,
      openProbeModal,
      closeProbeModal,
      setActiveRun,
      dismissToast,
      refreshAgentState,
      triggerAgent,
      runAutonomousBootstrap,
      resolveApproval,
      updateSkillEvidence,
      toneDownSkillClaim,
    }),
    [
      digitalTwin,
      runs,
      activeRun,
      pendingApprovals,
      isDrawerOpen,
      isExecuting,
      activeToast,
      bluffRiskCount,
      pendingApprovalsCount,
      isBluffAuditModalOpen,
      probeSkill,
      openDrawer,
      closeDrawer,
      toggleDrawer,
      openBluffAuditModal,
      closeBluffAuditModal,
      openProbeModal,
      closeProbeModal,
      setActiveRun,
      dismissToast,
      refreshAgentState,
      triggerAgent,
      runAutonomousBootstrap,
      resolveApproval,
      updateSkillEvidence,
      toneDownSkillClaim,
    ]
  );

  return (
    <AgentContext.Provider value={contextValue}>
      {children}
      {probeSkill && (
        <SkillMicroProbeModal
          skillName={probeSkill}
          isOpen={Boolean(probeSkill)}
          onClose={closeProbeModal}
        />
      )}
      <BluffRiskAuditModal
        isOpen={isBluffAuditModalOpen}
        onClose={closeBluffAuditModal}
        onLaunchProbe={(skillName) => {
          closeBluffAuditModal();
          openProbeModal(skillName);
        }}
      />
    </AgentContext.Provider>
  );
}

export function useAgent(): AgentContextValue {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgent must be used within an <AgentProvider />");
  }
  return context;
}
