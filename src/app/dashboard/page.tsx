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
    <div className="mx-auto max-w-7xl space-y-6 pb-8">
      {/* Clean Empty State Before Resume Upload */}
      {!hasRealData ? (
        <div className="rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-10 text-center space-y-2">
          <p className="text-base font-semibold text-[#F5F5F5]">
            Ready to Analyze Your Resume
          </p>
          <p className="text-sm text-[#A1A1AA] max-w-xl mx-auto leading-relaxed">
            Select your target role and upload your PDF resume in the Robot Agent above. Your extracted skills, projects, role gaps, and matched live jobs will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Authentic Candidate Summary KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                Candidate Profile
              </p>
              <p className="mt-2 text-xl font-bold text-[#F5F5F5] truncate">
                {candidateName || uploadedFileName || "Uploaded Resume"}
              </p>
              <p className="mt-1 text-xs text-[#A1A1AA] truncate">
                Target: {targetRole || "Software Engineer"}
              </p>
            </div>

            <div className="rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                Role-Targeted ATS Fit
              </p>
              <p className="mt-2 text-3xl font-bold text-[#10B981] tabular-nums">
                {atsScore !== null ? `${atsScore}%` : "Scored"}
              </p>
              <p className="mt-1 text-xs text-[#71717A]">Calibrated for {targetRole}</p>
            </div>

            <div className="rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                Extracted Skills
              </p>
              <p className="mt-2 text-3xl font-bold text-[#F5F5F5] tabular-nums">{skills.length}</p>
              <p className="mt-1 text-xs text-[#71717A] truncate">
                Verified from {uploadedFileName || "PDF"}
              </p>
            </div>

            <div className="rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#71717A]">
                Extracted Projects
              </p>
              <p className="mt-2 text-3xl font-bold text-[#F5F5F5] tabular-nums">{projects.length}</p>
              <p className="mt-1 text-xs text-[#71717A]">{missingSkills.length} role skill gaps detected</p>
            </div>
          </div>

          {/* Extracted Skills vs. Missing Skills for Target Role */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-5 space-y-3.5">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#F5F5F5]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#10B981]" />
                <span>
                  Real Extracted Skills from {uploadedFileName || "Your Resume"} ({skills.length})
                </span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#1D1D1D] bg-[#121212] px-3 py-1 text-xs font-medium text-[#F5F5F5]"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#10B981]" />
                    <span>{s.name}</span>
                    <span className="text-[#71717A]">• {s.level}</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-5 space-y-3.5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#F5F5F5]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" />
                  <span>
                    Missing Skills for {targetRole || "Target Role"} ({missingSkills.length})
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => router.push("/readiness")}
                  className="cursor-pointer shrink-0 text-xs font-medium text-[#A1A1AA] hover:text-[#F5F5F5] transition-colors"
                >
                  Open Study Plan →
                </button>
              </div>
              {missingSkills.length === 0 ? (
                <p className="text-xs text-[#71717A]">No major missing skills flagged for this role.</p>
              ) : (
                <div className="space-y-2">
                  {missingSkills.map((m, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-[#1D1D1D] bg-[#121212] px-3.5 py-2.5 text-xs leading-relaxed"
                    >
                      <span className="font-semibold text-[#F59E0B]">{String(m.skill || "")}</span>{" "}
                      <span className="text-[#A1A1AA]">— {String(m.reason || "")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Extracted Resume Projects */}
          {projects.length > 0 && (
            <div className="rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-5 space-y-3.5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F5F5F5]">
                Projects Extracted from Your Resume ({projects.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {projects.map((proj, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-[#1D1D1D] bg-[#121212] p-4 space-y-2 transition-colors hover:border-[#292929]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#F5F5F5]">
                        {String(proj.name || "")}
                      </span>
                      <span className="text-xs font-mono text-[#A1A1AA]">
                        {Array.isArray(proj.techStack)
                          ? proj.techStack.map((t) => getSkillName(t)).join(", ")
                          : ""}
                      </span>
                    </div>
                    <ul className="list-disc list-inside text-xs text-[#A1A1AA] space-y-1 leading-relaxed">
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
            <div className="rounded-xl border border-[#1D1D1D] bg-[#0D0D0D] p-5 space-y-3.5">
              <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#F5F5F5]">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#A78BFA]" />
                <span>
                  Suggested Bullet Rewrites for {targetRole} ({bulletImprovements.length})
                </span>
              </h3>
              <div className="space-y-3">
                {bulletImprovements.map((b, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-[#1D1D1D] bg-[#121212] p-4 text-xs space-y-1.5 leading-relaxed"
                  >
                    <p className="text-[#71717A] font-medium">
                      Source: {String(b.verifiedSourceProject || "")}
                    </p>
                    <p className="text-[#F43F5E]/90 line-through">
                      - {String(b.originalBullet || "")}
                    </p>
                    <p className="text-[#10B981] font-medium">
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
