"use client";

import InterviewStudioStage from "@/components/interview/InterviewStudioStage";

export default function QuestionBankPage() {
  return (
    <InterviewStudioStage
      mode="bank"
      initialRole="Full-Stack SDE"
      initialCategory="all"
      backHref="/interview"
      pageTitle="Standard Question Bank"
      pageSubtitle="Practice technical, behavioral, and HR interview questions tailored to your selected engineering role."
      badgeLabel="Question Bank"
      badgeVariant="indigo"
      showRoleSelector={true}
      showCategoryFilters={true}
    />
  );
}

