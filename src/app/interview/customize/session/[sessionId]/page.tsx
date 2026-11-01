import CustomInterviewSessionWorkspace from "@/components/interview/CustomInterviewSessionWorkspace";

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function CustomInterviewSessionPage({ params }: PageProps) {
  const { sessionId } = await params;
  return <CustomInterviewSessionWorkspace sessionId={sessionId} />;
}

