"use client";

import { useMemo } from "react";
import { clientService } from "@/domains/client/service";
import { STRINGS } from "@/lib/i18n/strings";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ChevronLeft, 
  Mail, 
  Phone, 
  MapPin, 
  Users, 
  Coins, 
  Briefcase,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

export default function Client360Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const clientId = params.clientId as string;
  const client = clientService.getClientById(clientId);

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-xl font-bold mb-4">找不到該客戶</p>
        <Button onClick={() => router.push("/crm")}>返回列表</Button>
      </div>
    );
  }

  const tabs = [
    { name: "總覽", href: `/crm/${clientId}` },
    { name: "現有保障", href: `/crm/${clientId}/policies` },
    { name: "保障缺口", href: `/crm/${clientId}/gap-analysis` },
    { name: "活動時間軸", href: `/crm/${clientId}/timeline` },
    { name: "報告歷史", href: `/crm/${clientId}/reports` },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Breadcrumb / Back */}
      <div className="flex items-center gap-2 text-sm font-bold text-zinc-400">
        <Link href="/crm" className="hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center transition-colors">
          <ChevronLeft className="w-4 h-4" /> 客戶列表
        </Link>
        <span>/</span>
        <span className="text-zinc-900 dark:text-zinc-100">{client.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* LEFT PANEL: Client Identity */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden sticky top-20">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center mb-4">
                  <Users className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold mb-1">{client.name}</h2>
                <Badge variant="outline" className="bg-green-50 text-green-600 border-none font-bold">
                  {STRINGS.crm.categories[client.status]}
                </Badge>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-zinc-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">電子郵件</p>
                    <p className="text-sm font-medium truncate">{client.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-zinc-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">聯絡電話</p>
                    <p className="text-sm font-medium">{client.phone}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Briefcase className="w-4 h-4 text-zinc-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">職業</p>
                    <p className="text-sm font-medium">{client.occupation}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Coins className="w-4 h-4 text-zinc-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">年收入 (約略)</p>
                    <p className="text-sm font-medium">{formatCurrency(client.annualIncome)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                <div>
                  <p className="text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wider italic">AI 標籤分析</p>
                  <div className="flex flex-wrap gap-2">
                    {client.aiTags.map(tag => (
                      <Badge key={tag} className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-none font-bold">
                        {tag}
                      </Badge>
                    ))}
                    {client.aiTags.length === 0 && <span className="text-xs text-zinc-400 italic">尚未生成分析標籤</span>}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-zinc-400 mb-3 uppercase tracking-wider">家庭成員</p>
                  <div className="space-y-2">
                    {client.family.map((member, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                        <span className="text-xs font-bold">{member.name}</span>
                        <Badge variant="ghost" className="text-[10px] py-0 h-4 uppercase">{member.relation}</Badge>
                      </div>
                    ))}
                    {client.family.length === 0 && <p className="text-xs text-zinc-400 italic">尚無資料</p>}
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-2">
                <Button className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700">開始 SPIN 對話</Button>
                <Button variant="outline" className="w-full rounded-xl">訪前規劃</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT PANEL: Tabs Content */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link 
                  key={tab.href} 
                  href={tab.href}
                  className={cn(
                    "px-5 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                    isActive 
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" 
                      : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  )}
                >
                  {tab.name}
                </Link>
              );
            })}
          </div>

          <div className="min-h-[500px]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
