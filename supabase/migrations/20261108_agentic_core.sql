-- ==============================================================================
-- Placement Co-pilot: Autonomous AI Agent Core Schema & RLS Policies (Track 1)
-- Migration: 20261108_agentic_core.sql
-- ==============================================================================

-- ==============================================================================
-- 1. Skill Evidence Matrix Table
-- Tracks student verified competencies, claimed levels, and bluff risks
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.skill_evidence_matrix (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  claimed_level TEXT NOT NULL CHECK (claimed_level IN ('LOW', 'MEDIUM', 'HIGH')),
  verified_confidence TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verified_confidence IN ('UNVERIFIED', 'LOW', 'MEDIUM', 'HIGH')),
  bluff_risk BOOLEAN NOT NULL DEFAULT FALSE,
  evidence_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_skill_evidence_user_skill UNIQUE (user_id, skill_name)
);

CREATE INDEX IF NOT EXISTS idx_skill_evidence_user_bluff ON public.skill_evidence_matrix(user_id, bluff_risk);
CREATE INDEX IF NOT EXISTS idx_skill_evidence_user_skill ON public.skill_evidence_matrix(user_id, skill_name);

ALTER TABLE public.skill_evidence_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own skill evidence"
  ON public.skill_evidence_matrix FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_skill_evidence_updated_at ON public.skill_evidence_matrix;
CREATE TRIGGER set_skill_evidence_updated_at
  BEFORE UPDATE ON public.skill_evidence_matrix
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 2. Agent Runs Table
-- State-machine execution traces and idempotency tracking for autonomous agent
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL UNIQUE,
  trigger_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  goal TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'AWAITING_APPROVAL', 'COMPLETED', 'COMPLETED_WITH_FALLBACK', 'FAILED')),
  reasoning_trace JSONB NOT NULL DEFAULT '[]'::jsonb,
  final_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_user_status ON public.agent_runs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_runs_idempotency ON public.agent_runs(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at ON public.agent_runs(user_id, created_at DESC);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own agent runs"
  ON public.agent_runs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_agent_runs_updated_at ON public.agent_runs;
CREATE TRIGGER set_agent_runs_updated_at
  BEFORE UPDATE ON public.agent_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 3. Agent Approvals Table
-- Human-in-the-loop review gating for resume diffs and high-impact actions
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.agent_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('RESUME_DIFF', 'APPLICATION_UPDATE')),
  target_entity_id TEXT NOT NULL,
  payload_diff JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_approvals_user_status ON public.agent_approvals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_approvals_run_id ON public.agent_approvals(run_id);

ALTER TABLE public.agent_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own agent approvals"
  ON public.agent_approvals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

