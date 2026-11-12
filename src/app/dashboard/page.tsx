"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useAgent } from "@/context/AgentProvider";

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
    <div className="mx-auto max-w-7xl space-y-6 pb-8 text-[#F5F6FF]">
      {/* Clean Empty State Before Resume Upload */}
      {!hasRealData ? (
        <div className="rounded-2xl border border-white/[0.07] bg-[#0B0C12] p-10 text-center space-y-2">
          <p className="text-base font-semibold text-white">
            Ready to Analyze Your Placement Readiness
          </p>
          <p className="text-sm text-[#8E93A6] max-w-xl mx-auto leading-relaxed">
            Select your target role and upload your PDF resume in the Agent Navigator above. Your extracted skills, projects, role gaps, and matched live jobs will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Authentic Candidate Summary KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Candidate Profile */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#0B0C12] p-5 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E93A6]">
                  Candidate Profile
                </p>
                <p className="mt-2 text-xl font-bold text-white truncate">
                  {candidateName || uploadedFileName || "Uploaded Resume"}
                </p>
                <p className="mt-1 text-xs text-[#8E93A6] truncate">
                  Target: {targetRole || "Software Engineer"}
                </p>
              </div>
              <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full bg-sky-500 rounded-full w-full" />
              </div>
            </div>

            {/* Card 2: Role-Targeted ATS Fit */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#0B0C12] p-5 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E93A6]">
                  Role-Targeted ATS Fit
                </p>
                <p className="mt-2 text-3xl font-bold text-emerald-400 tabular-nums">
                  {atsScore !== null ? `${atsScore}%` : "Scored"}
                </p>
                <p className="mt-1 text-xs text-[#8E93A6] truncate">Calibrated for {targetRole}</p>
              </div>
              <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, atsScore || 70))}%` }}
                />
              </div>
            </div>

            {/* Card 3: Extracted Skills */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#0B0C12] p-5 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E93A6]">
                  Extracted Skills
                </p>
                <p className="mt-2 text-3xl font-bold text-white tabular-nums">{skills.length}</p>
                <p className="mt-1 text-xs text-[#8E93A6] truncate">
                  Verified from {uploadedFileName || "PDF"}
                </p>
              </div>
              <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(10, skills.length * 8))}%` }}
                />
              </div>
            </div>

            {/* Card 4: Extracted Projects */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#0B0C12] p-5 flex flex-col justify-between space-y-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E93A6]">
                  Extracted Projects
                </p>
                <p className="mt-2 text-3xl font-bold text-amber-400 tabular-nums">{projects.length}</p>
                <p className="mt-1 text-xs text-[#8E93A6] truncate">
                  {missingSkills.length} role skill gaps detected
                </p>
              </div>
              <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(15, projects.length * 25))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Extracted Skills vs. Missing Skills for Target Role */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Verified Skills */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#0B0C12] p-5 space-y-4">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <span>
                  Verified Skills from {uploadedFileName || "Your Resume"} ({skills.length})
                </span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-200"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                    <span>{s.name}</span>
                    <span className="text-[#8E93A6] text-[11px]">• {s.level}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Critical Gaps to Address */}
            <div className="rounded-2xl border border-white/[0.07] bg-[#0B0C12] p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                  <span>
                    Critical Gaps to Address for {targetRole || "Target Role"} ({missingSkills.length})
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => router.push("/readiness")}
                  className="cursor-pointer shrink-0 text-xs font-medium text-[#8E93A6] hover:text-white transition-colors"
                >
                  Open Study Plan →
                </button>
              </div>

              {missingSkills.length === 0 ? (
                <p className="text-xs text-[#8E93A6]">No critical skill gaps flagged for this role.</p>
              ) : (
                <div className="space-y-2.5">
                  {missingSkills.map((m, idx) => (
                    <div
                      key={idx}
                      className="border border-rose-500/20 bg-rose-500/[0.04] rounded-xl p-3.5 text-xs leading-relaxed"
                    >
                      <span className="font-semibold text-rose-300">{String(m.skill || "")}</span>{" "}
                      <span className="text-[#8E93A6]">— {String(m.reason || "")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Extracted Resume Projects */}
          {projects.length > 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0B0C12] p-5 space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
                Projects Extracted from Your Resume ({projects.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {projects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-white/[0.06] bg-[#11131C]/80 hover:border-white/[0.12] p-4 space-y-2.5 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#F5F6FF]">
                        {String(proj.name || (proj as any)?.title || "Technical Project")}
                      </span>
                      <span className="text-xs font-mono text-[#8E93A6]">
                        {Array.isArray(proj.techStack)
                          ? proj.techStack.map((t) => getSkillName(t)).join(", ")
                          : ""}
                      </span>
                    </div>
                    <ul className="list-disc list-inside text-xs text-[#8E93A6] space-y-1 leading-relaxed">
                      {(Array.isArray(proj.bullets) ? proj.bullets : []).slice(0, 3).map((b, bIdx) => (
                        <li key={bIdx}>{String(b)}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grounded Resume Bullet Improvements */}
          {bulletImprovements.length > 0 && (
            <div className="rounded-2xl border border-white/[0.07] bg-[#0B0C12] p-5 space-y-4">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                <span>
                  Suggested Bullet Rewrites for {targetRole} ({bulletImprovements.length})
                </span>
              </h3>
              <div className="space-y-3">
                {bulletImprovements.map((b, idx) => (
                  <div
                    key={idx}
                    className="rounded-xl border border-white/[0.06] bg-[#11131C]/80 p-4 text-xs space-y-1.5 leading-relaxed"
                  >
                    <p className="text-[#8E93A6] font-medium">
                      Source: {String(b.verifiedSourceProject || "Projects")}
                    </p>
                    <p className="text-rose-400/90 line-through">
                      - {String(b.originalBullet || "")}
                    </p>
                    <p className="text-emerald-400 font-medium">
                      + {String(b.proposedBullet || "")}
                    </p>
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
