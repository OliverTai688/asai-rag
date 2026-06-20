"use client";

import { useParams } from "next/navigation";
import { useClientRelatedLists } from "@/components/crm/use-client-related-lists";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { AlertTriangle, FileText, Loader2, Plus, ShieldCheck } from "lucide-react";
import {
  CompactMetric,
  EmptyRelatedState,
  RecordSubpageHeader,
} from "../_components/record-subpage-ui";

export default function ClientPoliciesPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const { data, isLoading, error } = useClientRelatedLists(clientId);

  const policies = data?.lists.policies.items ?? [];
  const summary = data?.lists.policies.summary;

  if (!data && isLoading) {
    return (
      <EmptyRelatedState
        icon={Loader2}
        title="載入保單 related-list"
        description="正在讀取保單、保額與來源摘要。"
      />
    );
  }

  if (!data && error) {
    return (
      <EmptyRelatedState
        icon={AlertTriangle}
        title="保單資料暫時無法讀取"
        description="請稍後重試；目前先不顯示可能過期的本機暫存資料。"
      />
    );
  }

  return (
    <div className="space-y-5">
      <RecordSubpageHeader
        eyebrow="Related list"
        title="現有保障"
        description="用列表方式掃描保單類型、保額與承保公司；真正的登錄流程保留為後續 CRUD 卡。"
        action={
          <Button variant="mono" className="w-full rounded-full sm:w-auto">
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            手動登錄保單
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        <CompactMetric
          label="保單數"
          value={`${summary?.count ?? 0} 張`}
          helper="BFF 已確認保單"
        />
        <CompactMetric
          label="總保額"
          value={formatCurrency(summary?.totalInsuredAmount ?? 0)}
          helper="以目前資料加總"
        />
        <CompactMetric
          label="最高單筆"
          value={formatCurrency(summary?.largestInsuredAmount ?? 0)}
          helper="用來判斷保障集中度"
        />
      </div>

      {policies.length === 0 ? (
        <EmptyRelatedState
          icon={FileText}
          title="尚無既存保單資料"
          description="先補上保單類型、保額與承保公司，下一輪缺口分析才會更準。"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-hairline">
              {policies.map((policy) => (
                <div
                  key={policy.id}
                  className="grid gap-3 px-5 py-4 transition-colors hover:bg-paper-2/60 md:grid-cols-[minmax(0,1fr)_180px_160px]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-hairline bg-paper-2">
                      <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {policy.productName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {policy.provider}・{policy.category}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      保額
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">
                      {formatCurrency(policy.insuredAmount)}
                    </p>
                  </div>
                  <div className="flex items-center justify-start md:justify-end">
                    <Badge variant={policy.status === "ACTIVE" ? "success" : "outline"} className="h-6 text-[11px]">
                      {policy.status === "UNKNOWN" ? "待確認" : policy.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
