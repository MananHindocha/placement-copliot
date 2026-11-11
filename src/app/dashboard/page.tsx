"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAgent } from "@/context/AgentProvider";
import { IntegratedRobotNavigator } from "@/components/agent/IntegratedRobotNavigator";

function getSkillName(item: unknown): string {
  if (!item) return "";
  if (typeof item === "string") return item;
  if (typeof item === "object") {
    const obj = item as Record<string, unknown>;
    if (typeof obj.name === "string") return obj.name;
    if (typeof obj.skill_name === "string") return obj.skill_name;
    if (typeof obj.skill === "string") return obj.skill;
  }
  return String(item);
}

function getSkillLevel(item: unknown): string {
  if (!item || typeof item !== "object") return "VERIFIED";
  const obj = item as Record<string, unknown>;
  if (typeof obj.claimedLevel === "string") return obj.claimedLevel;
  if (typeof obj.verified_confidence === "string") return obj.verified_confidence;
  if (typeof obj.strength === "string") return obj.strength;
  return "VERIFIED";
}

export default function DashboardPage() {
  const router = useRouter();
  const { digitalTwin, parsedResume, targetRole, uploadedFileName } = useAgent();

  const rawSkills =
    parsedResume?.extractedSkills && parsedResume.extractedSkills.length > 0
      ? parsedResume.extractedSkills
      : digitalTwin?.skills || [];

  const skills = rawSkills
    .map((s) => ({
      name: getSkillName(s),
      level: getSkillLevel(s),
    }))
    .filter((s) => s.name.length > 0);

  const projects = Array.isArray(parsedResume?.projects) ? parsedResume.projects : [];
  const missingSkills = Array.isArray(parsedResume?.missingSkillsForTargetRole)
    ? parsedResume.missingSkillsForTargetRole
    : [];
  const bulletImprovements = Array.isArray(parsedResume?.bulletImprovements)
    ? parsedResume.bulletImprovements
    : [];
  const atsScore = parsedResume?.atsScore ?? digitalTwin?.atsScore ?? null;
  const candidateName = parsedResume?.candidateName || null;
  const hasRealData = skills.length > 0 || projects.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* 1. Single Integrated Robot Navigator */}
      <IntegratedRobotNavigator />

      {/* 2. Clean Empty State Before Resume Upload */}
      {!hasRealData ? (
        <div className="rounded-2xl border border-slate-800/80 bg-[#0A0D1C]/70 p-10 text-center text-slate-400">
          <p className="text-base font-semibold text-slate-200">
            Ready to Analyze Your Resume
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Select your target role and upload your PDF resume in the Robot Agent above. Your extracted skills, projects, role gaps, and matched live jobs will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 3. Authentic Candidate Summary KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-[#0A0D1C]/90 p-5">
              <p className="text-xs uppercase tracking-wider text-slate-400">Candidate Profile</p>
              <p className="mt-2 text-xl font-bold text-white truncate">
                {candidateName || uploadedFileName || "Uploaded Resume"}
              </p>
              <p className="mt-1 text-xs text-cyan-400">Target: {targetRole || "Software Engineer"}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0A0D1C]/90 p-5">
              <p className="text-xs uppercase tracking-wider text-slate-400">Role-Targeted ATS Fit</p>
              <p className="mt-2 text-3xl font-bold text-emerald-400">
                {atsScore !== null ? `${atsScore}%` : "Scored"}
              </p>
              <p className="mt-1 text-xs text-slate-400">Calibrated for {targetRole}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0A0D1C]/90 p-5">
              <p className="text-xs uppercase tracking-wider text-slate-400">Extracted Skills</p>
              <p className="mt-2 text-3xl font-bold text-cyan-400">{skills.length}</p>
              <p className="mt-1 text-xs text-slate-400">Verified from {uploadedFileName || "PDF"}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0A0D1C]/90 p-5">
              <p className="text-xs uppercase tracking-wider text-slate-400">Extracted Projects</p>
              <p className="mt-2 text-3xl font-bold text-purple-400">{projects.length}</p>
              <p className="mt-1 text-xs text-slate-400">{missingSkills.length} role skill gaps detected</p>
            </div>
          </div>

          {/* 4. Extracted Skills vs. Missing Skills for Target Role */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-[#0A0D1C]/90 p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Real Extracted Skills from {uploadedFileName || "Your Resume"} ({skills.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300"
                  >
                    {s.name} • {s.level}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0A0D1C]/90 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Missing Skills for {targetRole || "Target Role"} ({missingSkills.length})
                </h3>
                <button
                  type="button"
                  onClick={() => router.push("/readiness")}
                  className="cursor-pointer text-xs font-semibold text-cyan-400 hover:underline"
                >
                  Open Study Plan →
                </button>
              </div>
              {missingSkills.length === 0 ? (
                <p className="text-xs text-slate-400">No major missing skills flagged for this role.</p>
              ) : (
                <div className="space-y-2">
                  {missingSkills.map((m, idx) => (
                    <div
                      key={idx}
                      className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs"
                    >
                      <span className="font-semibold text-amber-300">{String(m.skill || "")}</span>{" "}
                      <span className="text-slate-400">— {String(m.reason || "")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 5. Extracted Resume Projects */}
          {projects.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-[#0A0D1C]/90 p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                Projects Extracted from Your Resume ({projects.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projects.map((proj, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-white">{String(proj.name || "")}</span>
                      <span className="text-xs text-cyan-400">
                        {Array.isArray(proj.techStack) ? proj.techStack.map((t) => getSkillName(t)).join(", ") : ""}
                      </span>
                    </div>
                    <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                      {(Array.isArray(proj.bullets) ? proj.bullets : []).slice(0, 3).map((b, bIdx) => (
                        <li key={bIdx}>{String(b)}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. Grounded Resume Bullet Improvements */}
          {bulletImprovements.length > 0 && (
            <div className="rounded-2xl border border-slate-800 bg-[#0A0D1C]/90 p-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">
                Suggested Bullet Rewrites for {targetRole} ({bulletImprovements.length})
              </h3>
              <div className="space-y-3">
                {bulletImprovements.map((b, idx) => (
                  <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-xs space-y-1.5">
                    <p className="text-slate-400 font-semibold">Source: {String(b.verifiedSourceProject || "")}</p>
                    <p className="text-red-300 line-through">- {String(b.originalBullet || "")}</p>
                    <p className="text-emerald-300 font-medium">+ {String(b.proposedBullet || "")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
