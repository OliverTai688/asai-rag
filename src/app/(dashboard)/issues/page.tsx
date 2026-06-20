import { requireCurrentMember } from "@/lib/auth/current-workspace";
import { listIssuesForMember } from "@/lib/issues/issues-repository";
import { IssuesPageClient } from "./issues-page-client";

export default async function IssuesPage() {
  const session = await requireCurrentMember();
  const initialIssues = await listIssuesForMember(session);

  return <IssuesPageClient initialIssues={initialIssues} />;
}
