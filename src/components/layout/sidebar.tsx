"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Theater,
  CalendarDays,
  FileText,
  Users2,
  Settings,
  Sparkles,
  Compass,
  ChevronLeft,
  ChevronRight,
  Bot,
  Flag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAssistantStore } from "@/domains/assistant/store";

const navItems = [
  { name: "總覽", href: "/dashboard", icon: LayoutDashboard },
  { name: "體驗版", href: "/pilot", icon: Compass },
  { name: "客戶管理", href: "/crm", icon: Users },
  { name: "SPIN 對話", href: "/spin", icon: MessageSquare },
  { name: "劇場演練", href: "/theater", icon: Theater },
  { name: "訪前規劃", href: "/pre-visit", icon: CalendarDays },
  { name: "分析報告", href: "/reports", icon: FileText },
  { name: "團隊管理", href: "/team", icon: Users2 },
  { name: "議題單", href: "/issues", icon: Flag },
  { name: "系統設定", href: "/settings", icon: Settings },
];

export function Sidebar({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const pathname = usePathname();
  const { togglePanel } = useAssistantStore();

  return (
    <div
      className={cn(
        "relative flex flex-col bg-white border-r transition-all duration-300 ease-in-out z-40",
        "border-[#D8E1EA] dark:bg-[#0F2744] dark:border-[rgba(144,202,249,0.15)]",
        open ? "w-60" : "w-[72px]"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-[#D8E1EA] dark:border-[rgba(144,202,249,0.15)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-[#173762] flex items-center justify-center shrink-0 shadow-sm">
            <Sparkles className="text-[#C9A227] w-4 h-4" />
          </div>
          {open && (
            <div className="flex flex-col leading-none">
              <span className="font-bold text-[15px] text-[#0A2342] dark:text-white whitespace-nowrap tracking-tight">
                誠問 AI
              </span>
              <span className="text-[9px] text-[#7B8B9A] dark:text-[#90CAF9] font-medium tracking-widest uppercase mt-0.5">
                Sincere Question
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative",
                  isActive
                    ? "bg-[#F1F6FB] dark:bg-[#1A3A6B]/40 text-[#0A2342] dark:text-[#90CAF9] font-semibold"
                    : "text-[#5F7080] dark:text-[#90CAF9]/70 hover:bg-[#F8FAFC] dark:hover:bg-[#1A3A6B]/20 hover:text-[#0A2342] dark:hover:text-white"
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 rounded-r bg-[#1565C0] dark:bg-[#2196F3]" />
                )}
                <item.icon
                  className={cn(
                    "w-[18px] h-[18px] shrink-0 transition-colors",
                    isActive
                      ? "text-[#1565C0] dark:text-[#2196F3]"
                      : "text-[#7B8B9A] dark:text-[#90CAF9]/60 group-hover:text-[#1565C0] dark:group-hover:text-[#90CAF9]"
                  )}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                {open && (
                  <span className="text-[13px] tracking-tight">{item.name}</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* AI Assistant Trigger */}
      <div className="px-3 pb-3 border-t border-[#D8E1EA] dark:border-[rgba(144,202,249,0.15)] pt-3">
        <button
          onClick={() => togglePanel()}
          className={cn(
            "w-full flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 transition-all duration-150",
            "bg-[#173762] hover:bg-[#0F2B50] text-white font-semibold text-[13px]",
            "shadow-sm",
            "border border-[#1565C0]/20",
            !open && "px-0"
          )}
        >
          <Bot className="w-[18px] h-[18px] shrink-0 text-[#C9A227]" strokeWidth={1.5} />
          {open && <span>誠問 AI 助手</span>}
        </button>
      </div>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-[#D8E1EA] dark:border-[rgba(144,202,249,0.15)]">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center text-[#5F7080] hover:text-[#0A2342] dark:text-[#90CAF9]/60 dark:hover:text-white hover:bg-[#F3F7FB] dark:hover:bg-[#1A3A6B]/30 rounded-lg text-[12px]"
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <>
              <ChevronLeft className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
              縮小側欄
            </>
          ) : (
            <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
          )}
        </Button>
      </div>
    </div>
  );
}
