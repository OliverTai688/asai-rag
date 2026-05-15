"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  MessageSquare, 
  Plus, 
  Search,
  Filter,
  Image as ImageIcon,
  User,
  ArrowRight,
  MoreVertical,
  Flag
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data based on the Prisma schema
const MOCK_ISSUES = [
  {
    id: "1",
    title: "SPIN 建議腳本在行動端跑版",
    description: "當我使用手機開啟 SPIN 引導時，建議提問的按鈕會重疊在一起，導致無法點擊。",
    category: "Bug",
    status: "OPEN",
    priority: "HIGH",
    reporterName: "王大明 (台北一區)",
    createdAt: "2026-04-24T10:00:00Z",
    images: ["https://picsum.photos/seed/issue1/400/300"],
    feedback: ""
  },
  {
    id: "2",
    title: "建議增加「轉介紹」專用的報告模板",
    description: "目前的報告模版偏向初訪，希望能有針對轉介紹客戶的專屬視覺風格。",
    category: "Feature",
    status: "IN_PROGRESS",
    priority: "MEDIUM",
    reporterName: "蔡佩芬 (台中通訊處)",
    createdAt: "2026-04-23T14:30:00Z",
    images: [],
    feedback: "開發團隊已收到建議，目前正在設計視覺稿。"
  },
  {
    id: "3",
    title: "客戶檔案上傳失敗",
    description: "嘗試上傳 5MB 的 PDF 檔案時會出現錯誤訊息。",
    category: "Bug",
    status: "RESOLVED",
    priority: "URGENT",
    reporterName: "李國樑 (高雄分社)",
    createdAt: "2026-04-22T09:15:00Z",
    images: [],
    feedback: "已修復檔案大小限制問題，現在支援最高 20MB 上傳。"
  }
];

const STATUS_MAP = {
  OPEN: { label: "待處理", color: "bg-red-100 text-red-700 border-red-200", icon: AlertCircle },
  IN_PROGRESS: { label: "處理中", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
  RESOLVED: { label: "已解決", color: "bg-green-100 text-green-700 border-green-200", icon: CheckCircle2 },
  CLOSED: { label: "已結案", color: "bg-zinc-100 text-zinc-700 border-zinc-200", icon: Flag },
};

const PRIORITY_MAP = {
  LOW: { label: "低", color: "text-zinc-500" },
  MEDIUM: { label: "中", color: "text-orange-500" },
  HIGH: { label: "高", color: "text-red-500 font-bold" },
  URGENT: { label: "緊急", color: "text-red-600 font-black animate-pulse" },
};

export default function IssuesPage() {
  const [selectedIssue, setSelectedIssue] = useState(MOCK_ISSUES[0]);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight">議題回饋單</h1>
          <p className="text-zinc-500 font-medium">收集並回覆業務人員的使用建議與問題。</p>
        </div>
        <Button className="bg-[#1A3A6B] hover:bg-[#1565C0] text-white rounded-2xl px-6 font-bold">
          <Plus className="w-4 h-4 mr-2" /> 新增議題
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Issue List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input 
              placeholder="搜尋議題標題或內容..." 
              className="pl-10 rounded-2xl border-zinc-200 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="space-y-3 h-[calc(100vh-280px)] overflow-y-auto pr-2 custom-scrollbar">
            {MOCK_ISSUES.map((issue) => (
              <Card 
                key={issue.id}
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md border-2",
                  selectedIssue.id === issue.id ? "border-[#1565C0] bg-[#EBF3FB]/30 shadow-sm" : "border-transparent bg-white"
                )}
                onClick={() => setSelectedIssue(issue)}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className={cn("rounded-lg text-[10px] uppercase font-bold px-2", STATUS_MAP[issue.status as keyof typeof STATUS_MAP].color)}>
                      {STATUS_MAP[issue.status as keyof typeof STATUS_MAP].label}
                    </Badge>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
                      {new Date(issue.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-black text-sm leading-tight mb-1 line-clamp-1">{issue.title}</h3>
                    <p className="text-xs text-zinc-500 line-clamp-2 font-medium">{issue.description}</p>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-600">
                      <User className="w-3 h-3" />
                      {issue.reporterName}
                    </div>
                    <div className={cn("text-[10px] font-black", PRIORITY_MAP[issue.priority as keyof typeof PRIORITY_MAP].color)}>
                      {PRIORITY_MAP[issue.priority as keyof typeof PRIORITY_MAP].label} 優先
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Issue Detail & Feedback */}
        <div className="lg:col-span-7">
          <Card className="rounded-[32px] border-zinc-200 shadow-xl shadow-zinc-200/20 bg-white h-full flex flex-col overflow-hidden">
            <CardHeader className="border-b border-zinc-100 bg-zinc-50/30 p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={cn("rounded-xl px-3 py-1 font-bold", STATUS_MAP[selectedIssue.status as keyof typeof STATUS_MAP].color)}>
                      {STATUS_MAP[selectedIssue.status as keyof typeof STATUS_MAP].label}
                    </Badge>
                    <Badge variant="secondary" className="rounded-xl px-3 py-1 font-bold bg-zinc-100 text-zinc-600">
                      {selectedIssue.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-2xl font-black">{selectedIssue.title}</CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <MoreVertical className="w-5 h-5 text-zinc-400" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-8 flex-1 overflow-y-auto custom-scrollbar space-y-8">
              {/* Issue Content */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-600">
                      <User className="w-5 h-5" />
                   </div>
                   <div>
                      <p className="text-sm font-bold">{selectedIssue.reporterName}</p>
                      <p className="text-xs text-zinc-400 font-medium">回報於 {new Date(selectedIssue.createdAt).toLocaleString()}</p>
                   </div>
                </div>
                <div className="p-6 rounded-[24px] bg-zinc-50 font-medium text-zinc-700 leading-relaxed border border-zinc-100">
                  {selectedIssue.description}
                </div>
                
                {selectedIssue.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedIssue.images.map((img, i) => (
                      <div key={i} className="aspect-video rounded-[24px] overflow-hidden border border-zinc-200 bg-zinc-100 group relative cursor-zoom-in">
                        <img src={img} alt="Issue Attachment" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Search className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Admin Feedback Section */}
              <div className="space-y-4 pt-4 border-t border-zinc-100">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#1565C0]" />
                  <h3 className="font-black text-lg">系統回饋</h3>
                </div>
                
                {selectedIssue.feedback ? (
                  <div className="p-6 rounded-[24px] bg-[#EBF3FB] border border-[#D6E8F8] text-[#0A2342] font-bold relative">
                    <div className="absolute -top-3 left-6 px-3 py-1 bg-[#1A3A6B] text-white text-[10px] rounded-full uppercase tracking-widest font-black">
                      OFFICIAL RESPONSE
                    </div>
                    {selectedIssue.feedback}
                  </div>
                ) : (
                  <div className="p-8 rounded-[24px] border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center text-center space-y-3 grayscale opacity-60">
                    <Clock className="w-10 h-10 text-zinc-300" />
                    <p className="text-sm font-bold text-zinc-400">目前尚無系統回饋，請耐心等候處理。</p>
                  </div>
                )}
              </div>

              {/* Action Area (Admin only view in real app) */}
              <div className="space-y-4 pt-4 border-t border-zinc-100">
                <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">更新處理進度</h4>
                <div className="space-y-3">
                  <Textarea 
                    placeholder="輸入回覆或處理進度..." 
                    className="rounded-[24px] border-zinc-200 min-h-[120px] p-4 font-bold focus-visible:ring-[#1A3A6B] bg-zinc-50/30"
                  />
                  <div className="flex gap-3">
                    <Button className="flex-1 bg-[#1A3A6B] hover:bg-[#1565C0] text-white rounded-2xl font-bold h-12">
                      送出回饋
                    </Button>
                    <Button variant="outline" className="rounded-2xl font-bold px-6 border-zinc-200 h-12">
                      標記為已解決
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
