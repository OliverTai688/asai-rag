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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "總覽", href: "/dashboard", icon: LayoutDashboard },
  { name: "客戶管理", href: "/crm", icon: Users },
  { name: "SPIN 對話", href: "/spin", icon: MessageSquare },
  { name: "劇場演練", href: "/theater", icon: Theater },
  { name: "訪前規劃", href: "/pre-visit", icon: CalendarDays },
  { name: "分析報告", href: "/reports", icon: FileText },
  { name: "團隊管理", href: "/team", icon: Users2 },
  { name: "系統設定", href: "/settings", icon: Settings },
];

export function Sidebar({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "relative flex flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 transition-all duration-300 ease-in-out z-40",
        open ? "w-64" : "w-20"
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          {open && (
            <span className="font-bold text-lg whitespace-nowrap bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
              誠問 AI
            </span>
          )}
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-semibold"
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                <item.icon className={cn("w-5 h-5 shrink-0", isActive ? "text-indigo-600 dark:text-indigo-400" : "group-hover:text-zinc-900 dark:group-hover:text-zinc-100")} />
                {open && <span className="text-sm">{item.name}</span>}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-center text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          onClick={() => setOpen(!open)}
        >
          {open ? <ChevronLeft className="w-5 h-5 mr-2" /> : <ChevronRight className="w-5 h-5" />}
          {open && "縮小側欄"}
        </Button>
      </div>
    </div>
  );
}
