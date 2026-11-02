import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { DSA_OA_PROBLEMS } from "@/lib/dsa-oa-questions";
import DsaProblemWorkspace from "@/components/interview/DsaProblemWorkspace";

interface PageProps {
  params: Promise<{ questionId: string }>;
}

export function generateStaticParams() {
  const params: Array<{ questionId: string }> = [];
  DSA_OA_PROBLEMS.forEach((p) => {
    params.push({ questionId: p.number.toString() });
    params.push({ questionId: p.id });
  });
  return params;
}

export default async function DsaQuestionPage({ params }: PageProps) {
  const { questionId } = await params;

  const problem = DSA_OA_PROBLEMS.find(
    (p) => p.number.toString() === questionId || p.id.toLowerCase() === questionId.toLowerCase()
  );

  if (!problem) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <Card className="p-8 text-center space-y-5 bg-[#0d1322] border-white/10 rounded-2xl shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/25 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-white mb-2">
              Problem Not Found
            </h1>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              We couldn&apos;t find a coding challenge with identifier <span className="font-mono text-indigo-300 font-bold">&ldquo;{questionId}&rdquo;</span>. Please check the problem number or return to the problemset.
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

  return (
    <DsaProblemWorkspace
      problem={problem}
      allProblems={DSA_OA_PROBLEMS}
      backHref="/interview/dsa"
    />
  );
}

