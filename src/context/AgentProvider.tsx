"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
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
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setActiveRun: (run: AgentRunRecord | null) => void;
  dismissToast: () => void;
  refreshAgentState: () => Promise<void>;
  triggerAgent: (payload: TriggerAgentPayload) => Promise<AgentRunRecord | null>;
  resolveApproval: (
    approvalId: string,
    decision: "APPROVED" | "REJECTED"
  ) => Promise<{ success: boolean; message: string }>;
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
    try {
      const res = await fetch("/api/agent/twin", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        if (data.digitalTwin) setDigitalTwin(data.digitalTwin);
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
    }
  }, []);

  // Initial mount hydration
  useEffect(() => {
    refreshAgentState();

    // Listen for cross-module agent mutations
    const handleMutation = () => {
      refreshAgentState();
    };

    window.addEventListener("agent-state-mutated", handleMutation);
    window.addEventListener("copilot-data-updated", handleMutation);

    return () => {
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
      openDrawer,
      closeDrawer,
      toggleDrawer,
      setActiveRun,
      dismissToast,
      refreshAgentState,
      triggerAgent,
      resolveApproval,
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
      openDrawer,
      closeDrawer,
      toggleDrawer,
      setActiveRun,
      dismissToast,
      refreshAgentState,
      triggerAgent,
      resolveApproval,
    ]
  );

  return <AgentContext.Provider value={contextValue}>{children}</AgentContext.Provider>;
}

export function useAgent(): AgentContextValue {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgent must be used within an <AgentProvider />");
  }
  return context;
}
