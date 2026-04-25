"use client";

import { useState, useEffect, useRef } from "react";
import { useAssistantStore } from "@/domains/assistant/store";
import { assistantService } from "@/domains/assistant/service";
import { AssistantMessage } from "@/domains/assistant/types";
import { 
  Bot, 
  User, 
  Send, 
  X, 
  Sparkles, 
  Compass, 
  Zap,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { FormattedTime } from "@/components/ui/formatted-time";

export function GlobalAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { 
    messages, 
    addMessage, 
    isPanelOpen, 
    togglePanel, 
    suggestions, 
    setSuggestions 
  } = useAssistantStore();
  
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // 當路徑改變時更新建議
  useEffect(() => {
    const context = { route: pathname };
    const nextSuggestions = assistantService.getStaticSuggestions(context);
    setSuggestions(nextSuggestions);
  }, [pathname, setSuggestions]);

  // 自動捲動
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async (overrideInput?: string) => {
    const text = overrideInput || input;
    if (!text.trim() || isTyping) return;

    const userMsg: AssistantMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      createdAt: new Date().toISOString(),
    };

    setInput("");
    addMessage(userMsg);
    setIsTyping(true);

    try {
      const res = await fetch("/api/mock/ai/assistant", {
        method: "POST",
        body: JSON.stringify({
          messages: [...messages, userMsg],
          context: { route: pathname }
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      const assistantMsg: AssistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "",
        createdAt: new Date().toISOString(),
      };

      let fullText = "";
      // 我們這裡簡單處理，先加一個空的 assistant 訊息
      addMessage({ ...assistantMsg, content: "...思考中" });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        fullText += chunk;
        // 更新最後一筆訊息
        const lastMsg = useAssistantStore.getState().messages.slice(-1)[0];
        useAssistantStore.setState((state) => ({
          messages: [...state.messages.slice(0, -1), { ...lastMsg, content: fullText }]
        }));
      }

      // 工具解析
      const tools = assistantService.parseTools(fullText);
      tools.forEach(tool => {
        if (tool.action === 'NAVIGATE') {
          toast.info(`正在導航至 ${tool.params}`);
          router.push(tool.params);
          togglePanel(false);
        }
      });

      const finalContent = assistantService.cleanResponse(fullText);
      // 再次更新最後一筆為乾淨內容
      useAssistantStore.setState((state) => ({
        messages: [...state.messages.slice(0, -1), { ...assistantMsg, content: finalContent }]
      }));

    } catch (err) {
      toast.error("助理連線失敗");
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* FAB */}
      <Button 
        onClick={() => togglePanel()}
        className={cn(
          "fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl z-50 transition-all active:scale-95 group",
          isPanelOpen ? "bg-zinc-800 scale-0" : "bg-indigo-600 hover:bg-indigo-700"
        )}
      >
        <Bot className="w-7 h-7 text-white group-hover:animate-bounce" />
      </Button>

      <Sheet open={isPanelOpen} onOpenChange={togglePanel}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col border-l-zinc-200 dark:border-l-zinc-800 shadow-2xl">
          <SheetHeader className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                   <Bot className="w-6 h-6" />
                </div>
                <div>
                   <SheetTitle className="text-xl font-black">ASAI 智能助手</SheetTitle>
                   <SheetDescription className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
                     Cross-Domain Copilot
                   </SheetDescription>
                </div>
             </div>
          </SheetHeader>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar"
          >
             {messages.length === 0 && (
               <div className="py-10 text-center space-y-6">
                  <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto">
                     <Sparkles className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">有什麼我可以幫您的？</h4>
                    <p className="text-sm text-zinc-500 mt-2">您可以問我關於 ${pathname} 的事，或要求我跳轉到特定頁面。</p>
                  </div>
               </div>
             )}

             {messages.map((m) => (
                <div key={m.id} className={cn("flex flex-col", m.role === 'user' ? "items-end" : "items-start")}>
                   <div className={cn(
                     "max-w-[85%] p-4 rounded-3xl text-sm leading-relaxed font-bold shadow-sm",
                     m.role === 'user' 
                       ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tr-none" 
                       : "bg-indigo-600 text-white rounded-tl-none ring-4 ring-indigo-50 dark:ring-indigo-900/20"
                   )}>
                      {m.content}
                   </div>
                    <span className="text-[9px] font-bold text-zinc-400 mt-1 uppercase tracking-tighter">
                       {m.role} • <FormattedTime isoString={m.createdAt} />
                    </span>
                </div>
             ))}

             {isTyping && (
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                   <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                   <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                </div>
             )}
          </div>

          <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
             <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button 
                    key={s.id}
                    onClick={() => handleSend(s.label)}
                    className="px-3 py-1.5 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all flex items-center gap-1.5 group"
                  >
                     <Zap className="w-3 h-3 text-indigo-400 group-hover:fill-current" /> {s.label}
                  </button>
                ))}
             </div>
             <div className="relative">
                <Textarea 
                  placeholder="輸入指令或問題..."
                  className="rounded-3xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 min-h-[60px] max-h-[120px] pr-12 focus-visible:ring-indigo-500 py-4 font-bold"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <Button 
                  size="icon"
                  className={cn(
                    "absolute right-2 bottom-2 w-10 h-10 rounded-2xl transition-all",
                    input.trim() ? "bg-indigo-600 text-white scale-100" : "scale-0 bg-zinc-100"
                  )}
                  onClick={() => handleSend()}
                >
                  <ArrowRight className="w-5 h-5" />
                </Button>
             </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
