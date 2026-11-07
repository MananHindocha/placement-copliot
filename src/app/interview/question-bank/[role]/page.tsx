import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import InterviewStudioStage from "@/components/interview/InterviewStudioStage";
import { QUESTION_BANK_ROLES, getRoleBySlug } from "@/lib/interview-roles";

interface PageProps {
  params: Promise<{ role: string }>;
}

export function generateStaticParams() {
  return QUESTION_BANK_ROLES.map((r) => ({
    role: r.slug,
  }));
}

export default async function RoleQuestionBankPage({ params }: PageProps) {
  const { role } = await params;
  const roleMeta = getRoleBySlug(role);

  if (!roleMeta) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <Card className="p-8 text-center space-y-5 bg-[#0B0D18] border-white/10 rounded-2xl shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/25 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-white mb-2">
              Interview Role Not Found
            </h1>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              We couldn&apos;t find an interview role matching <span className="font-mono text-indigo-300 font-bold">&ldquo;{role}&rdquo;</span>. Please choose from our available engineering roles.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/interview/question-bank">
              <Button variant="primary" icon={<ArrowLeft className="w-4 h-4" />}>
                Back to Role Selection
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <InterviewStudioStage
      mode="bank"
      initialRole={roleMeta.title}
      initialCategory="all"
      backHref="/interview/question-bank"
      pageTitle={`${roleMeta.title} Question Bank`}
      pageSubtitle={`Practice ${roleMeta.title} technical questions, system design, problem solving, and behavioral STAR scenarios.`}
      badgeLabel="Question Bank"
      badgeVariant="indigo"
      showRoleSelector={false}
      showCategoryFilters={true}
      requireManualStart={true}
    />
  );
}

