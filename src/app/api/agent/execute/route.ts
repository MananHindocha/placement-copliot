import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  resolveEffectiveUserId,
  runPlacementAgent,
  getPersistentSupabaseClient,
} from "@/lib/agent/orchestrator";
import { get_student_twin_context } from "@/lib/agent/tools-read";

function getSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key || url.includes("your-project-id.supabase.co")) {
    return getPersistentSupabaseClient();
  }
  try {
    return createClient(url, key, { auth: { persistSession: false } });
  } catch {
    return getPersistentSupabaseClient();
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const queryUserId = req.nextUrl.searchParams.get("userId") || undefined;
    const { effectiveUserId, isGuest } = resolveEffectiveUserId(queryUserId);

    const [twinResult, { data: runs }, { data: approvals }] = await Promise.all([
      get_student_twin_context(effectiveUserId, {}, supabase),
      supabase
        .from("agent_runs")
        .select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("agent_approvals")
        .select("*")
        .eq("user_id", effectiveUserId)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false }),
    ]);

    return NextResponse.json({
      success: true,
      isGuest,
      userId: effectiveUserId,
      digitalTwin: twinResult.data,
      runs: runs || [],
      pendingApprovals: approvals || [],
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Failed to fetch agent state from Supabase.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getSupabaseServerClient();
    const { effectiveUserId } = resolveEffectiveUserId(body.userId);

    const result = await runPlacementAgent(
      {
        userId: effectiveUserId,
        triggerType: body.triggerType || "USER_GOAL_SUBMITTED",
        entityId: body.entityId || "manual",
        goalPrompt: body.goalPrompt || "",
        metadata: body.metadata || {},
      } as any,
      supabase
    );

    const twinResult = await get_student_twin_context(effectiveUserId, {}, supabase);

    return NextResponse.json({
      success: result.status !== "FAILED",
      ...result,
      digitalTwin: twinResult.data,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        status: "FAILED",
        error: err?.message || "Failed to execute placement agent.",
      },
      { status: 500 }
    );
  }
}
