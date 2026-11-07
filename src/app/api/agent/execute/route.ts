import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  runPlacementAgent,
  getLatestAgentRuns,
  getPendingAgentApprovals,
  type AgentRunPayload,
} from "@/lib/agent/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resolves current user ID from Supabase session or defaults to Guest Demo ID.
 */
async function resolveUser(): Promise<{ userId: string; supabase: any }> {
  if (!isSupabaseConfigured()) {
    return { userId: "guest-demo-user", supabase: null };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { userId: "guest-demo-user", supabase };
    }

    return { userId: user.id, supabase };
  } catch {
    return { userId: "guest-demo-user", supabase: null };
  }
}

/**
 * POST /api/agent/execute
 * Executes autonomous agent for a trigger event or returns deduplicated existing run.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, supabase } = await resolveUser();

    const triggerType = body.triggerType || "USER_GOAL_SUBMITTED";
    const entityId = body.entityId;
    const goalPrompt = body.goalPrompt;
    const metadata = body.metadata || {};

    const payload: AgentRunPayload = {
      userId,
      triggerType,
      entityId,
      goalPrompt,
      metadata,
    };

    const result = await runPlacementAgent(payload, supabase);

    return NextResponse.json({
      success: true,
      deduplicated: result.deduplicated,
      run: result.run,
    });
  } catch (error: any) {
    console.error("[Agent Execute Route Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to execute agent loop",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent/execute
 * Returns the latest 10 agent runs and pending approvals for the current user.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, supabase } = await resolveUser();
    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));

    const [runs, pendingApprovals] = await Promise.all([
      getLatestAgentRuns(userId, limit, supabase),
      getPendingAgentApprovals(userId, supabase),
    ]);

    return NextResponse.json({
      success: true,
      userId,
      runs,
      pendingApprovals,
    });
  } catch (error: any) {
    console.error("[Agent Execute GET Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch agent runs",
      },
      { status: 500 }
    );
  }
}

