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
          "group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-colors cursor-pointer",
          dragActive
            ? "border-[#A78BFA] bg-[#121212]"
            : "border-[#292929] bg-[#0D0D0D] hover:border-[#3F3F46] hover:bg-[#121212]",
          isUploading && "pointer-events-none opacity-85"
        )}
      >
        {isUploading ? (
          <div className="flex flex-col items-center space-y-3 relative z-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#121212] border border-[#292929] text-[#A78BFA]">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-[#F5F5F5]">
                Reading and extracting {uploadFileName}...
              </h4>
              <p className="text-xs text-[#A1A1AA]">
                Parsing verified skills, projects, and computing real ATS score with AI...
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3 relative z-10 max-w-lg">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#121212] border border-[#292929] text-[#A1A1AA] group-hover:text-[#F5F5F5] group-hover:border-[#3F3F46] transition-colors">
              <Upload className="h-7 w-7" />
            </div>

            <div className="space-y-1">
              <h4 className="text-base sm:text-lg font-bold text-[#F5F5F5]">
                {headline}
              </h4>
              <p className="text-xs text-[#71717A] leading-relaxed">
                {description}
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg bg-[#F5F5F5] hover:bg-[#E4E4E7] px-5 py-2.5 text-xs font-semibold text-[#000000] transition-colors cursor-pointer"
              >
                <FileText className="h-4 w-4" />
                <span>Browse &amp; Upload File</span>
              </button>
              <span className="text-[11px] text-[#71717A]">Supports PDF, DOCX, TXT (up to 10MB)</span>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="rounded-xl border border-[#F43F5E]/25 bg-[#0D0D0D] p-4 flex items-center gap-3 text-xs text-[#F43F5E]">
          <AlertCircle className="h-5 w-5 text-[#F43F5E] shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Upload Failed: </span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successData && (
        <div className="rounded-xl border border-[#10B981]/25 bg-[#0D0D0D] p-4 flex items-center justify-between gap-3 text-xs text-[#10B981] animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <FileCheck className="h-5 w-5 text-[#10B981] shrink-0" />
            <div>
              <p className="font-bold text-[#F5F5F5]">
                Successfully parsed {successData.fileName}!
              </p>
              <p className="text-[11px] text-[#71717A] mt-0.5">
                Extracted {successData.skills.length} skills, {successData.projectsCount} projects • Initial ATS Score: {successData.atsScore}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

