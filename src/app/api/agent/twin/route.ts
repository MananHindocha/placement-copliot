import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { get_student_twin_context } from "@/lib/agent/tools-read";
import {
  getLatestAgentRuns,
  getPendingAgentApprovals,
} from "@/lib/agent/orchestrator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
 * GET /api/agent/twin
 * Returns the unified snapshot of:
 * - StudentDigitalTwinSnapshot (skills, claimed levels, verified confidence, bluff risks)
 * - Latest Agent Runs (with step-by-step reasoning traces)
 * - Pending Agent Approvals (HITL resume diffs)
 */
export async function GET(req: NextRequest) {
  try {
    const { userId, supabase } = await resolveUser();
    const url = new URL(req.url);
    const limit = Math.min(25, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));

    const [twinResult, runs, pendingApprovals] = await Promise.all([
      get_student_twin_context(userId, { forceRefresh: false }, supabase),
      getLatestAgentRuns(userId, limit, supabase),
      getPendingAgentApprovals(userId, supabase),
    ]);

    return NextResponse.json({
      success: true,
      userId,
      digitalTwin: twinResult.data,
      runs,
      pendingApprovals,
    });
  } catch (error: any) {
    console.error("[Agent Twin Route Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to hydrate career digital twin",
      },
      { status: 500 }
    );
  }
}
