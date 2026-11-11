import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { DSA_OA_PROBLEMS } from "@/lib/dsa-oa-questions";
import { findRepoProblemForWorkspace } from "@/lib/interview/company-problems";
import DsaProblemWorkspace from "@/components/interview/DsaProblemWorkspace";

interface PageProps {
  params: Promise<{ questionId: string }>;
  searchParams?: Promise<{ company?: string; timeframe?: string }>;
}

export function generateStaticParams() {
  const params: Array<{ questionId: string }> = [];
  DSA_OA_PROBLEMS.forEach((p) => {
    params.push({ questionId: p.number.toString() });
    params.push({ questionId: p.id });
  });
  return params;
}

export default async function DsaQuestionPage({ params, searchParams }: PageProps) {
  const { questionId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const curatedProblem = DSA_OA_PROBLEMS.find(
    (p) => p.number.toString() === questionId || p.id.toLowerCase() === questionId.toLowerCase()
  );

  if (curatedProblem) {
    return (
      <DsaProblemWorkspace
        problem={curatedProblem}
        allProblems={DSA_OA_PROBLEMS}
        backHref="/interview/dsa"
      />
    );
  }

  const repoMatch = await findRepoProblemForWorkspace({
    questionId,
    company: resolvedSearchParams?.company,
    timeframe: resolvedSearchParams?.timeframe,
  });

  if (repoMatch) {
    return (
      <DsaProblemWorkspace
        problem={repoMatch.problem}
        allProblems={repoMatch.allProblems}
        backHref="/interview/dsa"
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <Card className="p-8 text-center space-y-5 bg-[#0D0D0D] border-[#1D1D1D] rounded-xl">
        <div className="w-12 h-12 rounded-xl bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/25 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-[#F5F5F5] mb-2">
            Problem Not Found
          </h1>
          <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
            We couldn&apos;t find a coding challenge with identifier <span className="font-mono text-[#F5F5F5] font-bold">&ldquo;{questionId}&rdquo;</span>. Please check the problem number or return to the problemset.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/interview/dsa">
            <Button variant="primary" icon={<ArrowLeft className="w-4 h-4" />}>
              Back to OA &amp; DSA Problemset
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

