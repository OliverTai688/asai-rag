"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AddRelationshipDialog } from "@/components/crm/AddRelationshipDialog";
import { RelationshipMap } from "@/components/crm/RelationshipMap";
import { RelationshipGraphSourceReview } from "@/components/crm/RelationshipGraphSourceReview";
import { useClientRecord } from "@/components/crm/use-client-record";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildClientRelationshipGraphReview } from "@/domains/client/relationship-graph";
import { clientService } from "@/domains/client/service";
import { Info, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import {
  CompactMetric,
  EmptyRelatedState,
  IconAction,
  RecordSubpageHeader,
} from "../_components/record-subpage-ui";

export default function ClientRelationshipsPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const { client } = useClientRecord(clientId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"child" | "parent">("child");
  const [targetNodeId, setTargetNodeId] = useState<string | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const graphReview = useMemo(
    () => (client ? buildClientRelationshipGraphReview(client) : null),
    [client],
  );

  function openDialogForRoot() {
    setTargetNodeId(null);
    setDialogMode("child");
    setDialogOpen(true);
  }

  function openDialogForNodeAsChild(memberId: string | null) {
    setTargetNodeId(memberId);
    setDialogMode("child");
    setDialogOpen(true);
  }

  function openDialogForNodeAsParent(memberId: string | null) {
    setTargetNodeId(memberId);
    setDialogMode("parent");
    setDialogOpen(true);
  }

  async function handleDeleteMember(memberId: string, memberName: string) {
    if (!confirm("確定要刪除此關係人嗎？")) return;

    try {
      setDeletingMemberId(memberId);
      await clientService.deleteFamilyMemberRemote(clientId, memberId);
      toast.success(`${memberName} 已刪除`);
    } catch (error) {
      console.error(error);
      toast.error("刪除失敗，請稍後再試");
    } finally {
      setDeletingMemberId(null);
    }
  }

  if (!client || !graphReview) return null;

  const directConnections = client.family.filter((member) => !member.parentMemberId).length;
  const withPhone = client.family.filter((member) => member.phone).length;

  return (
    <div className="space-y-5">
      <RecordSubpageHeader
        eyebrow="Relationship graph"
        title="關係人管理"
        description="先看家庭與社會關係的覆蓋狀況，再補上真正會影響保障責任的關係人。"
        action={
          <Button
            variant="mono"
            className="w-full rounded-full sm:w-auto"
            onClick={openDialogForRoot}
          >
            <UserPlus className="h-4 w-4" strokeWidth={1.5} />
            新增關係人
          </Button>
        }
      />

      <AddRelationshipDialog
        clientId={clientId}
        clientName={client.name}
        existingMembers={client.family}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultParentMemberId={targetNodeId}
        mode={dialogMode}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <CompactMetric label="關係人" value={`${client.family.length} 位`} helper="已建立節點" />
        <CompactMetric label="直接連結" value={`${directConnections} 位`} helper="連到主客戶" />
        <CompactMetric label="可聯絡" value={`${withPhone} 位`} helper="已留電話" />
      </div>

      <RelationshipMap
        client={client}
        onAddChild={openDialogForNodeAsChild}
        onAddParent={openDialogForNodeAsParent}
      />

      <RelationshipGraphSourceReview graph={graphReview} />

      {client.family.length === 0 ? (
        <EmptyRelatedState
          icon={Info}
          title="尚無關係人資料"
          description="新增配偶、子女或其他關鍵關係人後，系統會用同一份資料更新關係圖與後續訪談線索。"
        />
      ) : (
        <Card>
          <CardHeader className="border-b border-hairline pb-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" strokeWidth={1.5} />
              關係人清單
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-hairline">
              {client.family.map((member) => {
                const parentName =
                  member.parentMemberId
                    ? client.family.find((candidate) => candidate.id === member.parentMemberId)?.name ??
                      "主客戶"
                    : "主客戶";

                return (
                  <div
                    key={member.id}
                    className="grid gap-3 px-5 py-4 transition-colors hover:bg-paper-2/60 md:grid-cols-[minmax(0,1fr)_160px_120px_48px]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-hairline bg-paper-2 text-sm font-semibold text-foreground">
                        {member.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {member.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.age ? `${member.age} 歲・` : ""}
                          連結至 {parentName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Badge variant="secondary" className="h-6 text-[11px]">
                        {member.relation}
                      </Badge>
                    </div>
                    <p className="flex items-center text-sm font-medium text-muted-foreground">
                      {member.phone ?? "未留電話"}
                    </p>
                    <div className="flex items-center justify-start md:justify-end">
                      <IconAction
                        label={`刪除 ${member.name}`}
                        icon={Trash2}
                        variant="ghost"
                        disabled={deletingMemberId === member.id}
                        onClick={() => void handleDeleteMember(member.id, member.name)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
