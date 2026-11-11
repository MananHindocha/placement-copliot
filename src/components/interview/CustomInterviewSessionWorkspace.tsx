"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { ArrowLeft, AlertCircle, Sparkles, Loader2 } from "lucide-react";
import InterviewStudioStage from "@/components/interview/InterviewStudioStage";
import {
  getCustomInterviewSession,
  type CustomInterviewSession,
} from "@/lib/custom-interview-storage";

interface CustomInterviewSessionWorkspaceProps {
  sessionId: string;
}

export default function CustomInterviewSessionWorkspace({
  sessionId,
}: CustomInterviewSessionWorkspaceProps) {
  const [session, setSession] = useState<CustomInterviewSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loaded = getCustomInterviewSession(sessionId);
    setSession(loaded);
    setLoading(false);
  }, [sessionId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-24 px-4 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#A78BFA] mx-auto" />
        <p className="text-xs text-[#71717A] font-mono">
          Loading personalized interview workspace...
        </p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <Card className="p-8 text-center space-y-5 bg-[#0D0D0D] border-[#1D1D1D] rounded-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/25 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-[#F5F5F5] mb-2">
              Interview Session Not Found
            </h1>
            <p className="text-xs text-[#71717A] max-w-md mx-auto leading-relaxed">
              We couldn&apos;t retrieve the custom interview session with ID{" "}
              <span className="font-mono text-[#F5F5F5] font-bold">&ldquo;{sessionId}&rdquo;</span>.
              The session may have expired or was configured on another device.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/interview/customize">
              <Button variant="primary" icon={<ArrowLeft className="w-4 h-4" />} className="cursor-pointer">
                Back to Question Generator
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const roleTitle = session.targetRole || "Full-Stack SDE";
  const companyTitle = session.targetCompany ? ` for ${session.targetCompany}` : "";

  return (
    <InterviewStudioStage
      mode="custom"
      initialRole={roleTitle}
      initialCategory="custom-jd"
      initialQuestions={session.generatedQuestions}
      backHref="/interview/customize"
      pageTitle={`${roleTitle}${companyTitle} Interview`}
      pageSubtitle={
        session.targetCompany
          ? `Personalized practice interview for ${session.targetCompany} based on your resume projects and job description.`
          : `Personalized practice interview tailored to your resume projects and target role.`
      }
      badgeLabel="✨ Custom Tailored Mode"
      badgeVariant="emerald"
      showRoleSelector={false}
      showCategoryFilters={false}
      requireManualStart={true}
      startCardIcon="brain"
      startCardTitle="Ready for Your Custom Interview?"
      startCardDescription={`Your AI interviewer is ready with ${session.generatedQuestions.length} tailored questions based on your resume and target job requirements.`}
      startCardIndicators={[
        { label: "Tailored Questions", dotColor: "bg-[#10B981]" },
        { label: "JD & Resume Alignment", dotColor: "bg-[#A78BFA]" },
        { label: "Voice & Pacing Analysis", dotColor: "bg-[#38BDF8]" },
        { label: "Detailed Evaluation", dotColor: "bg-[#F59E0B]" },
      ]}
    />
  );
}

