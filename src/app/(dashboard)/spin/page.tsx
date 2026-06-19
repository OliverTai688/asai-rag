"use client";

import { useSpinStore } from "@/domains/spin/store";
import { clientService } from "@/domains/client/service";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Plus, 
  ChevronRight, 
  Clock, 
  User,
  Search
} from "lucide-react";
import Link from "next/link";
import { useState, useMemo, useEffect, useSyncExternalStore } from "react";
import { Input } from "@/components/ui/input";
import { FormattedTime } from "@/components/ui/formatted-time";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { QuickstartGuide } from "@/components/demo/quickstart-guide";
import { getQuickstartSpinFixture } from "@/domains/demo/quickstart";

function SpinListContent() {
  const router = useRouter();
  const { sessions, createSession, updateSession, addMessage } = useSpinStore();
  const searchParams = useCurrentSearchParams();
  const demoParam = searchParams.get("demo");
  const autoCreate = searchParams.get("autoCreate");
  const clientId = searchParams.get("clientId");
  const isQuickstart = demoParam === "quickstart";
  const [search, setSearch] = useState("");
  const allClients = useMemo(() => clientService.getAllClients(), []);

  useEffect(() => { 
    if (autoCreate === "true" && clientId) {
      const client = allClients.find(c => c.id === clientId);
      if (client) {
        const existingQuickstartSession = isQuickstart
          ? sessions.find(
              (session) =>
                session.clientId === client.id &&
                session.phase === "COMPLETE" &&
                session.summary?.keyInsights?.some((insight) => insight.includes("家庭責任"))
            )
          : undefined;
        const session = existingQuickstartSession ?? createSession(client.id, client.name);

        if (isQuickstart && !existingQuickstartSession) {
          const fixture = getQuickstartSpinFixture(session.id);
          updateSession(session.id, {
            phase: fixture.session.phase,
            mode: fixture.session.mode,
            outputs: fixture.session.outputs,
            transitions: fixture.session.transitions,
            summary: fixture.session.summary,
          });
          fixture.messages.forEach((message) => addMessage(session.id, message));
        }

        router.replace(`/spin/${session.id}${isQuickstart ? "?demo=quickstart" : ""}`);
      }
    }
  }, [addMessage, allClients, autoCreate, clientId, createSession, isQuickstart, router, sessions, updateSession]);

  const filteredClients = useMemo(() => {
    return allClients.filter(c => c.name.includes(search));
  }, [allClients, search]);

  const handleStartSession = (clientId: string, clientName: string) => {
    const session = createSession(clientId, clientName);
    router.push(`/spin/${session.id}${isQuickstart ? "?demo=quickstart" : ""}`);
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">AI 了解客戶</h1>
          <p className="text-zinc-500 font-medium">用白話陪你釐清客戶狀況，背後以 SPIN 架構整理需求與下一步。</p>
        </div>
        
        <Dialog>
          <DialogTrigger>
            <div className="inline-flex items-center justify-center rounded-full bg-[#1A3A6B] hover:bg-[#1565C0] h-11 px-6 shadow-lg shadow-[#1565C0]/20 text-white font-medium text-sm cursor-pointer transition-colors">
              <Plus className="w-5 h-5 mr-2" /> 開始新對話
            </div>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-3xl border-zinc-200 dark:border-zinc-800">
            <DialogHeader>
              <DialogTitle>選擇客戶</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input 
                  placeholder="搜尋客戶姓名..." 
                  className="pl-10 h-11 rounded-xl bg-zinc-50 border-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {filteredClients.map(client => (
                  <button 
                    key={client.id}
                    onClick={() => handleStartSession(client.id, client.name)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#EBF3FB] dark:bg-[#1A3A6B]/20 flex items-center justify-center">
                        <User className="w-4 h-4 text-[#1565C0]" />
                      </div>
                      <span className="font-bold">{client.name}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <QuickstartGuide currentStepId="spin" />

      {sessions.length === 0 ? (
        <div className="text-center py-32 bg-white dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-zinc-100 dark:border-zinc-800">
          <div className="w-16 h-16 bg-[#EBF3FB] dark:bg-[#1A3A6B]/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-[#1565C0]" />
          </div>
          <h3 className="text-lg font-bold mb-2">尚無對話記錄</h3>
          <p className="text-zinc-500 mb-6">點擊上方按鈕，開始為您的客戶規劃 SPIN 銷售策略。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sessions.map((session) => (
            <Link key={session.id} href={`/spin/${session.id}`}>
              <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-all group overflow-hidden">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#EBF3FB] dark:bg-[#1A3A6B]/20 flex items-center justify-center text-[#1565C0] group-hover:scale-110 transition-transform">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-lg">{session.clientName}</span>
                        <Badge variant="outline" className="text-[10px] py-0 h-4 bg-zinc-100 dark:bg-zinc-800 border-none font-bold">
                          {session.phase}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" /> 最後更新於 <FormattedTime isoString={session.updatedAt} />
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SpinListPage() {
  return <SpinListContent />;
}

function useCurrentSearchParams() {
  const search = useSyncExternalStore(
    subscribeToLocationChanges,
    getLocationSearchSnapshot,
    () => ""
  );

  return useMemo(() => new URLSearchParams(search), [search]);
}

function getLocationSearchSnapshot() {
  return typeof window === "undefined" ? "" : window.location.search;
}

function subscribeToLocationChanges(onStoreChange: () => void) {
  const originalPushState = window.history.pushState.bind(window.history) as History["pushState"];
  const originalReplaceState = window.history.replaceState.bind(window.history) as History["replaceState"];
  const urlChangeEvent = "asai-spin-url-change";
  const emitUrlChange = () => setTimeout(() => window.dispatchEvent(new Event(urlChangeEvent)));
  const patchedPushState: History["pushState"] = (...args) => {
    const result = originalPushState(...args);
    emitUrlChange();
    return result;
  };
  const patchedReplaceState: History["replaceState"] = (...args) => {
    const result = originalReplaceState(...args);
    emitUrlChange();
    return result;
  };

  window.history.pushState = patchedPushState;
  window.history.replaceState = patchedReplaceState;
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener(urlChangeEvent, onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener(urlChangeEvent, onStoreChange);
    if (window.history.pushState === patchedPushState) {
      window.history.pushState = originalPushState;
    }
    if (window.history.replaceState === patchedReplaceState) {
      window.history.replaceState = originalReplaceState;
    }
  };
}
