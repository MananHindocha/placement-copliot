import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { update_skill_evidence } from "@/lib/agent/tools-write";
import {
  getMockStudentDigitalTwin,
  toneDownMockSkillClaim,
  syncMockDigitalTwinFromResume,
  insertMockAgentApproval,
} from "@/lib/agent/mock-agent-store";

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
 * POST /api/agent/evidence
 * Handles:
 * - action: "UPDATE_EVIDENCE" (e.g. Cleared 60-sec micro-probe drill)
 * - action: "TONE_DOWN_CLAIM" (Remediate Bluff Risk by reducing claimed level to Working Knowledge & auto-staging rewrite)
 * - action: "SYNC_FROM_RESUME" (Calibrate digital twin on resume upload)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, supabase } = await resolveUser();

    const action = body.action || "UPDATE_EVIDENCE";
    const skillName = body.skillName || body.skill;

    if (action === "TONE_DOWN_CLAIM") {
      if (!skillName) {
        return NextResponse.json({ success: false, error: "skillName is required" }, { status: 400 });
      }

      const originalBullet = body.originalBullet || `Demonstrated expert proficiency in ${skillName}.`;
      const defensibleRewrite = body.defensibleRewrite || `Integrated ${skillName} for production service reliability and schema operations.`;

      // 1. Recalibrate mock store
      const updatedSkill = toneDownMockSkillClaim(userId, skillName, defensibleRewrite);

      // 2. Stage defensible rewrite approval
      const stagedApproval = insertMockAgentApproval({
        id: `appr-tone-${Date.now()}`,
        user_id: userId,
        run_id: `run-tone-${Date.now()}`,
        action_type: "RESUME_DIFF",
        target_entity_id: `skill-${skillName}`,
        status: "PENDING",
        payload_diff: {
          roleTarget: "Recruiter-Safe Defensible Recalibration",
          summary: `Recalibrated resume claim for "${skillName}" from Expert to Working Knowledge to eliminate interview bluff risk.`,
          suggestedAdditions: [
            `Replaced aggressive claim: "${originalBullet}"`,
            `With defensible bullet: "${defensibleRewrite}"`,
          ],
          suggestedKeywords: [skillName, "Defensible Experience", "Production Application"],
          highlightedProjects: ["Core Production Services"],
        },
        created_at: new Date().toISOString(),
      });

      // 3. Supabase update if live
      if (supabase && userId !== "guest-demo-user") {
        try {
          await supabase
            .from("skill_evidence_matrix")
            .update({
              claimed_level: "MEDIUM",
              bluff_risk: false,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId)
            .ilike("skill_name", skillName);

          await supabase.from("agent_approvals").insert({
            user_id: userId,
            action_type: "RESUME_DIFF",
            target_entity_id: `skill-${skillName}`,
            payload_diff: {
              skillName,
              originalBullet,
              defensibleRewrite,
              action: "TONE_DOWN_CLAIM",
            },
            status: "PENDING",
          });
        } catch (dbErr) {
          console.warn("[evidence/route] Supabase update warning:", dbErr);
        }
      }

      const twin = getMockStudentDigitalTwin(userId);
      return NextResponse.json({
        success: true,
        message: `Claim for ${skillName} toned down to Medium (Working Knowledge). Bluff risk cleared.`,
        skill: updatedSkill,
        digitalTwin: twin,
        stagedApproval,
      });
    }

    if (action === "SYNC_FROM_RESUME") {
      const fileName = body.fileName || "Uploaded Resume.pdf";
      const skills = syncMockDigitalTwinFromResume(userId, fileName);
      const twin = getMockStudentDigitalTwin(userId);

      return NextResponse.json({
        success: true,
        message: `Digital Twin synchronized from ${fileName}.`,
        skills,
        digitalTwin: twin,
      });
    }

    // Default: UPDATE_EVIDENCE (e.g. from 60-second micro-probe)
    if (!skillName) {
      return NextResponse.json({ success: false, error: "skillName is required" }, { status: 400 });
    }

    const verdict = body.verdict || "POSITIVE";
    const source = body.source || "READINESS_DRILL";
    const evidenceCitation =
      body.evidenceCitation ||
      body.citation ||
      `Cleared 60-sec Adversarial Micro-Probe on ${skillName}`;

    const updateResult = await update_skill_evidence(
      userId,
      {
        skillName,
        verdict,
        source,
        evidenceCitation,
      },
      supabase
    );

    const twin = getMockStudentDigitalTwin(userId);

    return NextResponse.json({
      success: true,
      message: updateResult.summary,
      data: updateResult.data,
      digitalTwin: twin,
    });
  } catch (error: any) {
    console.error("[Evidence API Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update skill evidence" },
      { status: 500 }
    );
  }
}
