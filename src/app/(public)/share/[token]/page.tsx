"use client";

import { use, useEffect, useState } from "react";
import { useReportStore } from "@/domains/report/store";
import { reportService } from "@/domains/report/service";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  MapPin, 
  Clock, 
  ChevronRight, 
  ShieldCheck,
  CheckCircle2,
  Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FormattedTime } from "@/components/ui/formatted-time";

export default function ShareReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const { getReportByToken, recordAccess } = useReportStore();
  const report = getReportByToken(token);
  const [hasTracked, setHasTracked] = useState(false);

  useEffect(() => {
    if (report && !hasTracked) {
      recordAccess(token);
      setHasTracked(true);
      // 模擬傳送給後端 tracking API
      fetch(`/api/mock/track/${token}`, { method: 'POST' });
    }
  }, [report, token, recordAccess, hasTracked]);

  if (!report) {
     return (
       <div className="flex flex-col items-center justify-center min-h-screen p-10 text-center">
          <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
             <FileText className="text-zinc-300 w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold">報告不存在或已過期</h1>
          <p className="text-zinc-500 mt-2">請聯繫您的專業顧問獲取最新連結。</p>
       </div>
     );
  }

  const clientSections = reportService.getClientSections(report);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 md:py-20 animate-in fade-in slide-in-from-bottom-5 duration-1000">
      {/* Client Brand Header */}
      <div className="flex items-center justify-between mb-16">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-zinc-900 rounded-2xl flex items-center justify-center text-white">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="font-black text-xl tracking-tighter">ASAI | AUTHENTIC</span>
         </div>
         <Badge className="bg-green-50 text-green-700 border-none px-3 py-1 font-bold rounded-full">
            專業認證報告
         </Badge>
      </div>

      <header className="mb-20">
         <h1 className="text-4xl md:text-5xl font-black mb-6 tracking-tight leading-tight">
            為 {report.clientName} 準備的<br />
            決策建議報告
         </h1>
         <div className="flex flex-wrap gap-4 text-sm font-bold text-zinc-400 uppercase tracking-widest">
            <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> <FormattedTime isoString={report.createdAt} format="date" /></span>
            <span>•</span>
            <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> 預計閱讀時間：3 分鐘</span>
         </div>
      </header>

      <div className="space-y-24">
         {clientSections.map((section, idx) => (
           <section key={section.id} className="relative group">
              <div className="absolute -left-10 top-2 hidden md:flex items-center justify-center w-6 h-6 rounded-full bg-zinc-100 text-zinc-400 font-bold text-xs ring-4 ring-white">
                 {idx + 1}
              </div>
              <h2 className="text-2xl font-black mb-8 flex items-center gap-3">
                 <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                 {section.title}
              </h2>
              <div className="p-8 md:p-10 rounded-[40px] bg-zinc-50 border border-zinc-100 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
                 <p className="text-lg md:text-xl text-zinc-700 font-medium leading-relaxed italic whitespace-pre-wrap">
                    {section.content}
                 </p>
                 {section.type === 'recommendation' && (
                    <div className="mt-8 pt-8 border-t border-zinc-200/50 flex flex-col md:flex-row gap-4">
                       <div className="flex items-center gap-2 text-green-600 font-bold">
                          <CheckCircle2 className="w-5 h-5 fill-current" />
                          <span>優先執行建議組件</span>
                       </div>
                    </div>
                 )}
              </div>
           </section>
         ))}
      </div>

      <footer className="mt-32 pt-16 border-t border-zinc-100 text-center">
         <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">由 ASAI 智能引擎生成的專業分析</p>
         <div className="flex items-center justify-center gap-8">
            <div className="opacity-30 font-black tracking-tighter text-2xl grayscale">ASAI</div>
         </div>
      </footer>
    </div>
  );
}
