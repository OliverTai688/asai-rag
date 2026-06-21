import { MeetingWorkspace } from "@/components/meeting/meeting-workspace";

interface MeetingPageProps {
  params: Promise<{ planId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MeetingPage({ params, searchParams }: MeetingPageProps) {
  const { planId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const sessionId = firstParam(resolvedSearchParams.sessionId);
  const isQuickstart = firstParam(resolvedSearchParams.demo) === "quickstart";

  return (
    <MeetingWorkspace
      planId={planId}
      initialSessionId={sessionId}
      backHref={`/pre-visit/${planId}${isQuickstart ? "?demo=quickstart" : ""}`}
    />
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
