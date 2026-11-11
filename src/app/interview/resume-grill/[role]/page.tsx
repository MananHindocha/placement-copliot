import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ResumeGrillWorkspace from "@/components/interview/ResumeGrillWorkspace";
import { QUESTION_BANK_ROLES, getRoleBySlug } from "@/lib/interview-roles";

interface PageProps {
  params: Promise<{ role: string }>;
}

export function generateStaticParams() {
  return QUESTION_BANK_ROLES.map((r) => ({
    role: r.slug,
  }));
}

export default async function RoleResumeGrillPage({ params }: PageProps) {
  const { role } = await params;
  const roleMeta = getRoleBySlug(role);

  if (!roleMeta) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <Card className="p-8 text-center space-y-5 bg-[#0D0D0D] border-[#1D1D1D] rounded-xl">
          <div className="w-12 h-12 rounded-xl bg-[#F43F5E]/10 text-[#F43F5E] border border-[#F43F5E]/25 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>

          <div>
            <h1 className="text-xl font-bold text-[#F5F5F5] mb-2">
              Interview Role Not Found
            </h1>
            <p className="text-xs text-[#A1A1AA] max-w-md mx-auto">
              We couldn&apos;t find an interview role matching <span className="font-mono text-[#F59E0B] font-bold">&ldquo;{role}&rdquo;</span>. Please choose from our available engineering roles.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/interview/resume-grill">
              <Button variant="primary" icon={<ArrowLeft className="w-4 h-4" />}>
                Back to Role Selection
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return <ResumeGrillWorkspace roleMeta={roleMeta} />;
}

