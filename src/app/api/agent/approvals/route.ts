import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  getPendingAgentApprovals,
  resolveAgentApproval,
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
 * GET /api/agent/approvals
 * Lists pending approvals requiring human review.
 */
export async function GET() {
  try {
    const { userId, supabase } = await resolveUser();
    const pendingApprovals = await getPendingAgentApprovals(userId, supabase);

    return NextResponse.json({
      success: true,
      userId,
      pendingApprovals,
    });
  } catch (error: any) {
    console.error("[Agent Approvals GET Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch pending approvals",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/agent/approvals
 * Body: { approvalId: string, decision: 'APPROVED' | 'REJECTED' }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { approvalId, decision } = body;

    if (!approvalId) {
      return NextResponse.json(
        { success: false, error: "Missing required parameter 'approvalId'" },
        { status: 400 }
      );
    }

    if (decision !== "APPROVED" && decision !== "REJECTED") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid decision. Must be either 'APPROVED' or 'REJECTED'",
        },
        { status: 400 }
      );
    }

    const { userId, supabase } = await resolveUser();
    const result = await resolveAgentApproval(approvalId, decision, userId, supabase);

    return NextResponse.json(
      {
        success: result.success,
        message: result.message,
        approvalId,
        decision,
      },
      {
        headers: {
          "X-Agent-State-Version": Date.now().toString(),
        },
      }
    );
  } catch (error: any) {
    console.error("[Agent Approvals POST Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to resolve approval",
      },
      { status: 500 }
    );
  }
}

