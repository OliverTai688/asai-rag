"use client";

import { useState, useMemo, useEffect } from "react";
import { useReportStore } from "@/domains/report/store";
import { reportService } from "@/domains/report/service";
import { clientService } from "@/domains/client/service";
import { ReportSection } from "@/domains/report/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronLeft, 
  Save, 
  Share2, 
  Eye, 
  Printer, 
  Copy,
  Layout,
  Settings2,
  Sparkles,
  BarChart3,
  Globe,
  ArrowUpRight
} from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FormattedTime } from "@/components/ui/formatted-time";
import { Markdown } from "@/components/ui/markdown";

export default function ReportEditorPage() {
  const params = useParams();
  const reportId = params.reportId as string;
  const router = useRouter();
  
  const { getReportById, updateSection, generateShareToken } = useReportStore();
  const report = getReportById(reportId);
  
  const client = report ? clientService.getClientById(report.clientId) : null;
  
  const [activeTab, setActiveTab] = useState("internal");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  if (!report) return <div className="p-20 text-center">報告不存在</div>;

  const clientSections = reportService.getClientSections(report);
  const displaySections = activeTab === "internal" ? report.sections : clientSections;

  const handleStartEdit = (section: ReportSection) => {
    setEditingId(section.id);
    setEditValue(section.content);
  };

  const handleSaveEdit = (sectionId: string) => {
    updateSection(reportId, sectionId, editValue);
    setEditingId(null);
    toast.success("區塊更新成功");
  };

  const handleShare = () => {
    const token = report.share?.token || generateShareToken(reportId);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("分享連結已複製到剪貼簿！", {
      description: "客戶可於瀏覽器直接開啟報告。",
    });
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/reports" className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">{report.clientName} 決策報告</h2>
              <Badge variant="outline" className="text-[10px] py-0 border-zinc-200 uppercase font-black tracking-tighter">
                Version {report.version}.0
              </Badge>
            </div>
            <p className="text-sm text-zinc-500 font-medium">最後更新於 <FormattedTime isoString={report.updatedAt} /></p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-xl font-bold gap-2 border-zinc-200 dark:border-zinc-800" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> 預覽 PDF
          </Button>
          <Button className="rounded-xl font-bold gap-2 bg-[#1A3A6B] hover:bg-[#1565C0] shadow-lg shadow-[#1565C0]/20" onClick={handleShare}>
            <Share2 className="w-4 h-4" /> 共享連結
          </Button>
          <Button variant="ghost" size="icon" className="rounded-xl">
             <Settings2 className="w-4 h-4 text-zinc-400" />
          </Button>
        </div>
      </div>

      <div className="flex justify-center mb-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-sm">
          <TabsList className="bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl w-full h-auto shadow-inner">
            <TabsTrigger value="internal" className="flex-1 rounded-xl px-6 py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-900 data-[state=active]:shadow-md font-bold transition-all">
              內部視角 (Internal)
            </TabsTrigger>
            <TabsTrigger value="client" className="flex-1 rounded-xl px-6 py-2.5 data-[state=active]:bg-[#1A3A6B] data-[state=active]:text-white dark:data-[state=active]:bg-[#1A3A6B] data-[state=active]:shadow-md font-bold transition-all">
              客戶演示 (Client)
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar: Document Outline & Client Info */}
        <div className="hidden lg:block lg:col-span-3 sticky top-8 space-y-6">
          {client && (
            <div className="p-6 rounded-[32px] bg-[#1A3A6B] text-white shadow-xl shadow-[#1A3A6B]/20 overflow-hidden relative group">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors" />
              <h3 className="text-xs font-black uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> 客戶現況概覽
              </h3>
              <div className="space-y-3 relative z-10">
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-[10px] font-bold opacity-60">職業</span>
                  <span className="text-sm font-black">{client.occupation}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-[10px] font-bold opacity-60">年收入</span>
                  <span className="text-sm font-black">{client.annualIncome}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/10 pb-2">
                  <span className="text-[10px] font-bold opacity-60">家庭成員</span>
                  <span className="text-sm font-black">{client.family.length} 人</span>
                </div>
                <div className="pt-2">
                  <div className="flex flex-wrap gap-1">
                    {client.aiTags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white/10 rounded-full text-[9px] font-bold">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="p-6 rounded-[32px] bg-zinc-50 border border-zinc-100 dark:bg-zinc-900/50 dark:border-zinc-800">
            <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
              <Layout className="w-4 h-4" /> 報告大綱
            </h3>
            <div className="space-y-1">
              {displaySections.map((section, idx) => (
                <div key={`toc-${section.id}`} className="flex items-start gap-3 p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors group">
                  <span className="text-xs font-black text-zinc-300 group-hover:text-[#2196F3] mt-0.5">{String(idx + 1).padStart(2, '0')}</span>
                  <p className="text-sm font-bold text-zinc-600 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white leading-tight">
                    {section.title}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Center Canvas: The Document */}
        <div className="lg:col-span-6 space-y-6">
            <div className="animate-in fade-in zoom-in-95 duration-300">
              {displaySections.map((section, idx) => (
                <div key={section.id} className="relative group mb-12 last:mb-0">
                  {/* Subtle connector line */}
                  {idx !== displaySections.length - 1 && (
                    <div className="absolute left-6 top-full h-12 w-[2px] bg-zinc-100 dark:bg-zinc-800 -z-10" />
                  )}
                  
                  <Card className="rounded-[32px] border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow overflow-hidden bg-white dark:bg-zinc-950">
                    <div className="px-8 py-6 border-b border-zinc-50 dark:border-zinc-900 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/20">
                       <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-inner",
                            section.type === 'performance' ? "bg-orange-500" : "bg-[#1A3A6B]"
                          )}>
                             {section.type === 'performance' ? <BarChart3 className="w-5 h-5" /> : <span className="font-black text-sm">{idx + 1}</span>}
                          </div>
                          <div>
                            <h4 className="font-black text-lg">{section.title}</h4>
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{section.type}</p>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                          {section.isEdited && <Badge className="bg-amber-50 text-amber-600 hover:bg-amber-100 border-none rounded-full px-3 text-[10px] font-bold">已編輯</Badge>}
                          <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-zinc-400 hover:text-[#1565C0] hover:bg-[#EBF3FB] opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleStartEdit(section)}>
                             <Sparkles className="w-4 h-4" />
                          </Button>
                       </div>
                    </div>
                    <CardContent className="p-8">
                       {editingId === section.id ? (
                          <div className="space-y-4">
                             <Textarea 
                               className="min-h-[200px] rounded-2xl font-medium leading-loose text-lg border-[#90CAF9]/40 ring-[#D6E8F8] ring-4 ring-offset-0 resize-y p-6 bg-[#EBF3FB]/30"
                               value={editValue}
                               onChange={(e) => setEditValue(e.target.value)}
                               autoFocus
                             />
                             <div className="flex justify-end gap-3 pt-2">
                                <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setEditingId(null)}>取消</Button>
                                <Button className="rounded-xl font-bold bg-[#1A3A6B] hover:bg-[#1565C0] px-6 shadow-md shadow-[#90CAF9]/30" onClick={() => handleSaveEdit(section.id)}>
                                  <Save className="w-4 h-4 mr-2" /> 儲存變更
                                </Button>
                             </div>
                          </div>
                       ) : (
                           <Markdown content={section.content} isInternal={activeTab === "internal"} />                       )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
        </div>

        {/* Right Sidebar: Insights & Tips */}
        <div className="lg:col-span-3 space-y-6 sticky top-8">
           <Card className="rounded-[32px] border-zinc-200 dark:border-zinc-800 overflow-hidden bg-gradient-to-br from-zinc-900 to-[#0A2342] text-white border-none shadow-xl">
              <CardContent className="p-6">
                 <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-white/50">傳播與參與</h3>
                    <Globe className="w-4 h-4 text-[#2196F3]" />
                 </div>
                 <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                       <p className="text-[10px] font-black opacity-50 uppercase mb-1">閱讀次數</p>
                       <p className="text-2xl font-black">{report.share?.accessCount || 0}</p>
                    </div>
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10">
                       <p className="text-[10px] font-black opacity-50 uppercase mb-1">停留深度</p>
                       <p className="text-2xl font-black">85%</p>
                    </div>
                 </div>
                 <Button className="w-full bg-white text-zinc-900 hover:bg-white/90 rounded-2xl font-bold gap-2">
                    查看完整訪客地圖 <ArrowUpRight className="w-4 h-4" />
                 </Button>
              </CardContent>
           </Card>

           <Card className="rounded-[32px] border-zinc-200 dark:border-zinc-800 p-6 space-y-4 shadow-sm bg-white dark:bg-zinc-950">
               <h3 className="text-xs font-black text-zinc-400 uppercase tracking-widest">報告小撇步</h3>
               <div className="flex gap-4 p-4 rounded-2xl bg-[#EBF3FB]/50 dark:bg-[#1A3A6B]/10 border border-[#D6E8F8] dark:border-[rgba(144,202,249,0.15)]">
                  <Sparkles className="w-5 h-5 text-[#1565C0] shrink-0 mt-1" />
                  <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed italic">
                    「在『風險區塊』中加入更多具體的理賠案例，能有效提升客戶在回傳 share link 時的閱讀總時間。」
                  </p>
               </div>
           </Card>
        </div>
      </div>
    </div>
  );
}
