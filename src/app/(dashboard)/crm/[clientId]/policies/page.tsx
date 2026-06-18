"use client";

import { useParams } from "next/navigation";
import { useClientRecord } from "@/components/crm/use-client-record";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { FileText, Plus, ShieldCheck } from "lucide-react";
import {
  CompactMetric,
  EmptyRelatedState,
  RecordSubpageHeader,
} from "../_components/record-subpage-ui";

export default function ClientPoliciesPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const { client } = useClientRecord(clientId);

  if (!client) return null;

  const totalCoverage = client.existingPolicies.reduce(
    (sum, policy) => sum + policy.amount,
    0
  );
  const largestPolicy = client.existingPolicies.reduce(
    (largest, policy) => (policy.amount > largest ? policy.amount : largest),
    0
  );

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
          value={`${client.existingPolicies.length} 張`}
          helper="已記錄有效保障"
        />
        <CompactMetric
          label="總保額"
          value={formatCurrency(totalCoverage)}
          helper="以目前資料加總"
        />
        <CompactMetric
          label="最高單筆"
          value={formatCurrency(largestPolicy)}
          helper="用來判斷保障集中度"
        />
      </div>

      {client.existingPolicies.length === 0 ? (
        <EmptyRelatedState
          icon={FileText}
          title="尚無既存保單資料"
          description="先補上保單類型、保額與承保公司，下一輪缺口分析才會更準。"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-hairline">
              {client.existingPolicies.map((policy) => (
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
                        {policy.type}
                      </p>
                      <p className="text-xs text-muted-foreground">{policy.provider}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      保額
                    </p>
                    <p className="mt-1 text-sm font-semibold text-foreground tabular-nums">
                      {formatCurrency(policy.amount)}
                    </p>
                  </div>
                  <div className="flex items-center justify-start md:justify-end">
                    <Badge variant="outline" className="h-6 text-[11px]">
                      盤點可用
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
