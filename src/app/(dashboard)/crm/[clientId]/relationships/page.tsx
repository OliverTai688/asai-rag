"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { clientService } from "@/domains/client/service";
import { RelationshipMap } from "@/components/crm/RelationshipMap";
import { AddRelationshipDialog } from "@/components/crm/AddRelationshipDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Info, UserPlus } from "lucide-react";
import { useClientStore } from "@/domains/client/store";

export default function ClientRelationshipsPage() {
  const params = useParams();
  const clientId = params.clientId as string;

  const client = useClientStore((state) => state.getClientById(clientId));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"child" | "parent">("child");
  // null = connect to root, string = connect to that member id
  const [targetNodeId, setTargetNodeId] = useState<string | null>(null);

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

  if (!client) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">關係人管理</h1>
          <p className="text-sm text-zinc-500 font-medium mt-1">管理客戶的家屬、親戚及相關社會關係</p>
        </div>
        <Button
          onClick={openDialogForRoot}
          className="bg-[#1A3A6B] hover:bg-[#1565C0] text-white rounded-2xl font-bold gap-2"
        >
          <UserPlus className="w-4 h-4" /> 新增關係人
        </Button>
      </div>

      <AddRelationshipDialog
        clientId={clientId}
        clientName={client.name}
        existingMembers={client.family}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultParentMemberId={targetNodeId}
        mode={dialogMode}
      />

      <div className="grid grid-cols-1 gap-6">
        <RelationshipMap
          client={client}
          onAddChild={openDialogForNodeAsChild}
          onAddParent={openDialogForNodeAsParent}
        />

        <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <CardHeader className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-[#1565C0]" /> 關係人清單 ({client.family.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {client.family.map((member) => (
                <div
                  key={member.id}
                  className="p-4 flex items-center justify-between hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-500">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-zinc-900 dark:text-zinc-100">{member.name}</p>
                      <p className="text-xs text-zinc-400 font-medium">
                        {member.relation}
                        {member.age ? ` • ${member.age} 歲` : ""}
                        {member.parentMemberId
                          ? ` • 連結至 ${client.family.find((m) => m.id === member.parentMemberId)?.name ?? "主客戶"}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {member.phone && (
                      <span className="text-xs font-bold text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
                        {member.phone}
                      </span>
                    )}
                    <button
                      onClick={() => {
                        if (confirm("確定要刪除此關係人嗎？")) {
                          clientService.deleteFamilyMember(clientId, member.id);
                        }
                      }}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              ))}
              {client.family.length === 0 && (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-400">
                  <Info className="w-8 h-8 mb-2 opacity-20" />
                  <p className="font-medium">尚無關係人資料</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
