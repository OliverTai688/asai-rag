"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Filter, LayoutGrid, List, MoreVertical, Edit2, Trash2 } from "lucide-react";
import { clientService } from "@/domains/client/service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { STRINGS } from "@/lib/i18n/strings";
import { Client, ClientStatus } from "@/domains/client/types";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { AddClientDialog } from "@/components/crm/add-client-dialog";
import { FormattedTime } from "@/components/ui/formatted-time";
import { useMounted } from "@/lib/hooks/use-mounted";
import { Loader2, Users } from "lucide-react";

export default function CRMListPage() {
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "ALL">("ALL");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const mounted = useMounted();

  const allClients = useMemo(() => clientService.getAllClients(), []);
  
  const filteredClients = useMemo(() => {
    return allClients.filter(client => {
      const matchSearch = client.name.toLowerCase().includes(search.toLowerCase()) || 
                          client.email.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === "ALL" || client.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [allClients, search, statusFilter]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{STRINGS.crm.title}</h1>
          <p className="text-zinc-500 font-medium">管理您的客戶資料、查看互動歷史與保障建議。</p>
        </div>
        <Button 
          className="rounded-full bg-[#1A3A6B] hover:bg-[#1565C0] h-11 px-6 shadow-lg shadow-[#1565C0]/20"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="w-5 h-5 mr-2" /> {STRINGS.crm.addClient}
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-2 flex-1 w-full md:w-auto">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
              placeholder="搜尋姓名或郵件..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-10 bg-zinc-50/50 dark:bg-zinc-800/50 border-none rounded-xl"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <div className="inline-flex items-center h-10 gap-2 px-3 rounded-xl font-semibold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                <Filter className="w-4 h-4" />
                {statusFilter === "ALL" ? "所有狀態" : STRINGS.crm.categories[statusFilter]}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="rounded-xl border-zinc-200 dark:border-zinc-800">
              <DropdownMenuItem onClick={() => setStatusFilter("ALL")}>所有狀態</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("PROSPECT")}>潛在客戶</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("ACTIVE")}>正式客戶</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("CLOSED")}>結案客戶</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
          <Button 
            variant={viewMode === "table" ? "secondary" : "ghost"} 
            size="sm" 
            className="h-8 rounded-lg px-2"
            onClick={() => setViewMode("table")}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button 
            variant={viewMode === "grid" ? "secondary" : "ghost"} 
            size="sm" 
            className="h-8 rounded-lg px-2"
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* List Content */}
      {!mounted ? (
        <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-300 mb-4" />
          <p className="text-zinc-500 font-medium">載入客戶資料中...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="text-center py-32 bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-zinc-100 dark:border-zinc-800">
          <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-300">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold mb-2">找不到客戶</h3>
          <p className="text-zinc-500 mb-6">嘗試調整關鍵字或篩選條件。</p>
          <Button variant="outline" className="rounded-full" onClick={() => {setSearch(""); setStatusFilter("ALL");}}>清除所有篩選</Button>
        </div>
      ) : viewMode === "table" ? (
        <ClientTableView clients={filteredClients} />
      ) : (
        <ClientGridView clients={filteredClients} />
      )}

      <AddClientDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </div>
  );
}

function ClientTableView({ clients }: { clients: Client[] }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase">客戶姓名</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase">狀態</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase">職業</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase">AI 標籤</th>
              <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {clients.map((client) => (
              <tr key={client.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                <td className="px-6 py-4">
                  <Link href={`/crm/${client.id}`} className="block group-hover:translate-x-1 transition-transform">
                    <p className="font-bold text-sm leading-none mb-1 group-hover:text-[#1565C0] dark:group-hover:text-[#2196F3]">{client.name}</p>
                    <p className="text-xs text-zinc-400 font-medium">{client.email}</p>
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={client.status} />
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{client.occupation}</p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {client.aiTags.slice(0, 2).map(tag => (
                      <Badge key={tag} className="text-[10px] py-0 h-4 bg-[#EBF3FB] dark:bg-[#1A3A6B]/20 text-[#1565C0] dark:text-[#2196F3] border-none">
                        {tag}
                      </Badge>
                    ))}
                    {client.aiTags.length > 2 && <span className="text-[10px] text-zinc-400">+{client.aiTags.length - 2}</span>}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <div className="inline-flex items-center justify-center h-8 w-8 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors">
                        <MoreVertical className="w-4 h-4 text-zinc-400" />
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl border-zinc-200 dark:border-zinc-800">
                      <DropdownMenuItem className="gap-2"><Edit2 className="w-4 h-4" /> 編輯資料</DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-red-500"><Trash2 className="w-4 h-4" /> 刪除客戶</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ClientGridView({ clients }: { clients: Client[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {clients.map((client) => (
        <Link key={client.id} href={`/crm/${client.id}`} className="group">
          <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-all group-hover:translate-y-[-4px] group-hover:shadow-lg group-hover:border-[#90CAF9]/40 dark:group-hover:border-[#0A2342]/40">
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-[#EBF3FB] dark:group-hover:bg-[#1A3A6B]/20 transition-colors">
                  <Users className="w-6 h-6 text-zinc-400 group-hover:text-[#1565C0] transition-colors" />
                </div>
                <StatusBadge status={client.status} />
              </div>
              <div className="mb-4">
                <h3 className="font-bold text-lg leading-none mb-1 group-hover:text-[#1565C0] transition-colors">{client.name}</h3>
                <p className="text-xs text-zinc-500 font-medium truncate">{client.occupation}</p>
              </div>
              <div className="flex flex-wrap gap-1 mb-4 h-11 overflow-hidden">
                {client.aiTags.map(tag => (
                  <Badge key={tag} className="text-[10px] py-0 h-4 bg-[#EBF3FB] dark:bg-[#1A3A6B]/20 text-[#1565C0] dark:text-[#2196F3] border-none">
                    {tag}
                  </Badge>
                ))}
              </div>
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] font-bold text-zinc-400">
                <span>最後互動</span>
                <span><FormattedTime isoString={client.lastInteraction} format="date" /></span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: ClientStatus }) {
  const styles = {
    PROSPECT: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-100 dark:border-blue-900/20",
    ACTIVE: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400 border-green-100 dark:border-green-900/20",
    CLOSED: "bg-zinc-50 text-zinc-600 dark:bg-zinc-900/20 dark:text-zinc-400 border-zinc-100 dark:border-zinc-900/20",
  };
  
  return (
    <Badge variant="outline" className={cn("text-[10px] py-0 h-5 px-2 font-bold", styles[status])}>
      {STRINGS.crm.categories[status]}
    </Badge>
  );
}

