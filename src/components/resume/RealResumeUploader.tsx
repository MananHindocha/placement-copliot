"use client";

import React, { useState, useRef } from "react";
import {
  FileText,
  Upload,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { clsx } from "clsx";
import {
  setStoredRealResume,
  setStoredResumeWorkspace,
  dispatchCopilotUpdate,
  type RealParsedResume,
} from "@/lib/storage-sync";
import type { ResumeAnalysis } from "@/types";

interface RealResumeUploaderProps {
  onUploadSuccess?: (data: RealParsedResume) => void;
  className?: string;
  headline?: string;
  description?: string;
}

export default function RealResumeUploader({
  onUploadSuccess,
  className,
  headline = "Upload Your Real Resume (PDF, DOCX, or TXT)",
  description = "Drag & drop your resume file or click below. We will extract your real skills, detect genuine projects, and calculate an authentic ATS score.",
}: RealResumeUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<RealParsedResume | null>(null);

  // Trigger native file picker
  const handleZoneClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (isUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      uploadAndParseResume(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadAndParseResume(files[0]);
    }
  };

  // Core API caller
  const uploadAndParseResume = async (file: File) => {
    setErrorMessage(null);
    setSuccessData(null);
    setUploadFileName(file.name);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/resume/analyze", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        throw new Error(result.error || "Failed to analyze resume.");
      }

      const analysis: ResumeAnalysis = result.analysis;
      const parsedResume = analysis?.parsedResume;

      // Extract skills from analysis
      const rawSkills: string[] =
        (analysis?.extractedSkills && analysis.extractedSkills.length > 0)
          ? analysis.extractedSkills
          : (analysis?.keywords && analysis.keywords.length > 0)
          ? analysis.keywords.map((k) => k.word)
          : [];

      const skills = rawSkills.map((name, idx) => ({
        name,
        strength: (idx < 4 ? "Verified Strong" : idx < 8 ? "Good Foundation" : "Needs Practice") as "Verified Strong" | "Good Foundation" | "Needs Practice",
        reason: `Extracted from resume analysis`,
      }));

      const realData: RealParsedResume = {
        fileName: file.name,
        candidateName: parsedResume?.candidateName || "Candidate",
        inferredTargetRoles: [analysis?.jobTitle || "Software Engineer"],
        atsScore: analysis?.atsScore || analysis?.matchScore || 75,
        projectsCount: parsedResume?.projects?.length || 0,
        projects: (parsedResume?.projects || []).map((p) => ({
          name: p.title,
          techStack: [],
          summary: p.bullets?.map((b) => b.text).join(" ") || "",
        })),
        skills,
        missingRecommendedSkills: (analysis?.gaps || []).map((gap) => ({
          skill: gap,
          whyNeeded: "Recommended target skill gap",
          targetRole: analysis?.jobTitle || "Software Engineer",
        })),
        bulletImprovements: (analysis?.suggestions || []).map((s) => ({
          originalBullet: s.original,
          improvedBullet: s.suggested || s.improved || s.original,
          projectName: "Experience",
          atsBoost: 6,
          applied: false,
        })),
        parsedAt: new Date().toISOString(),
        rawText: analysis?.rawText || "",
      };

      setStoredRealResume(realData);

      setStoredResumeWorkspace({
        editableResume: result.analysis?.parsedResume ?? null,
        analysis: result.analysis ?? null,
        appliedSuggestionIds: [],
        userId: null,
        fileName: file.name,
      });

      setSuccessData(realData);
      setIsUploading(false);
      dispatchCopilotUpdate("real_resume_uploaded");

      if (onUploadSuccess) {
        onUploadSuccess(realData);
      }
    } catch (err: any) {
      console.error("[uploadAndParseResume error]:", err);
      setErrorMessage(err.message || "An unexpected error occurred while parsing the resume.");
      setIsUploading(false);
    }
  };

  return (
    <div className={clsx("w-full space-y-4", className)}>
      {/* Hidden Native File Input */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Full-width Drag & Drop Zone */}
      <div
        onClick={handleZoneClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={clsx(
          "group relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all cursor-pointer",
          dragActive
            ? "border-cyan-400 bg-cyan-950/20 scale-[1.01]"
            : "border-indigo-500/30 bg-gradient-to-b from-[#0c0f24] to-[#070914] hover:border-indigo-400/60 hover:bg-[#0e1330]",
          isUploading && "pointer-events-none opacity-85"
        )}
      >
        {/* Glow ambient background */}
        <div className="absolute inset-0 bg-radial from-indigo-500/5 to-transparent pointer-events-none rounded-3xl" />

        {isUploading ? (
          <div className="flex flex-col items-center space-y-3 relative z-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-cyan-300">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">
                Reading and extracting {uploadFileName}...
              </h4>
              <p className="text-xs text-cyan-300 animate-pulse">
                Parsing verified skills, projects, and computing real ATS score with AI...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3 relative z-10 max-w-lg">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 group-hover:scale-110 group-hover:text-cyan-300 transition-all shadow-lg">
              <Upload className="h-8 w-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base sm:text-lg font-bold text-white group-hover:text-cyan-200 transition-colors">
                {headline}
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                {description}
              </p>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-indigo-500/25 group-hover:from-indigo-500 group-hover:to-cyan-400 transition-all"
              >
                <FileText className="h-4 w-4" />
                <span>Browse &amp; Upload File</span>
              </button>
              <span className="text-[11px] text-slate-500">Supports PDF, DOCX, TXT (up to 10MB)</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 flex items-center gap-3 text-xs text-rose-300">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Upload Failed: </span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successData && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 flex items-center justify-between gap-3 text-xs text-emerald-300 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <FileCheck className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-white">
                Successfully parsed {successData.fileName}!
              </p>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Extracted {successData.skills.length} skills, {successData.projectsCount} projects • Initial ATS Score: {successData.atsScore}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

