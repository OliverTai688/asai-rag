import { MeetingWorkspace } from "@/components/meeting/meeting-workspace";

interface ClientMeetingPageProps {
  params: Promise<{ clientId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ClientMeetingPage({ params, searchParams }: ClientMeetingPageProps) {
  const { clientId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const sessionId = firstParam(resolvedSearchParams.sessionId);

  return (
    <MeetingWorkspace
      clientId={clientId}
      initialSessionId={sessionId}
      backHref={`/crm/${clientId}`}
      backLabel="回客戶總覽"
    />
  );
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
