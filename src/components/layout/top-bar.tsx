"use client";

import { Search, Menu, User, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NotificationHub } from "./notification-hub";

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header
      className="relative h-16 flex items-center justify-between px-5 md:px-6 bg-white/95 dark:bg-[#0F2744] z-30 shrink-0"
      style={{ borderBottom: "1px solid #D8E1EA" }}
    >
      <div className="flex items-center gap-4 flex-1 relative">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-[#5F7080] hover:text-[#0A2342] hover:bg-[#F3F7FB]"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" strokeWidth={1.5} />
        </Button>
        <div className="relative max-w-sm w-full hidden md:block">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7B8B9A]"
            strokeWidth={1.5}
          />
          <Input
            placeholder="搜尋客戶、對話或報告 (⌘K)"
            className="pl-9 h-9 bg-[#F8FAFC] dark:bg-[#1A3A6B]/20 border-[#D8E1EA] dark:border-[rgba(144,202,249,0.2)] rounded-lg text-sm text-[#0A1929] placeholder:text-[#7B8B9A] focus-visible:border-[#1565C0] focus-visible:ring-[#1565C0]/15"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 relative">
        {/* Notifications */}
        <NotificationHub />

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className="inline-flex items-center h-10 gap-2.5 px-2.5 hover:bg-[#F3F7FB] dark:hover:bg-[#1A3A6B]/30 rounded-lg cursor-pointer transition-colors">
              <div className="w-8 h-8 rounded-md bg-[#173762] flex items-center justify-center shadow-sm">
                <User className="text-white w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[13px] font-semibold text-[#0A2342] dark:text-white leading-none mb-1">王小明</p>
                <p className="text-[11px] text-[#5F7080] dark:text-[#90CAF9] font-medium">台北一區 · Agent</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#7B8B9A]" strokeWidth={1.5} />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 mt-2 rounded-lg border-[#D8E1EA] dark:border-[rgba(144,202,249,0.15)] bg-white dark:bg-[#0F2744] shadow-[0_14px_40px_rgba(10,35,66,0.12)]"
          >
            <DropdownMenuLabel className="text-[#546E7A] text-xs font-semibold uppercase tracking-widest">
              我的身份
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-[#CFD8DC]/60" />
            <DropdownMenuItem className="py-2.5 focus:bg-[#EBF3FB] dark:focus:bg-[#1A3A6B]/30">
              <div className="flex flex-col">
                <span className="font-semibold text-[#0A2342] dark:text-white text-sm">王小明</span>
                <span className="text-xs text-[#546E7A]">業務部 | 加值服務專員</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#CFD8DC]/60" />
            <DropdownMenuItem className="py-2 focus:bg-[#EBF3FB] dark:focus:bg-[#1A3A6B]/30 text-[#546E7A] text-sm">
              切換角色
            </DropdownMenuItem>
            <DropdownMenuItem className="text-[#546E7A] italic text-xs focus:bg-[#EBF3FB]/50">
              MOCK: Manager (張大壯)
            </DropdownMenuItem>
            <DropdownMenuItem className="text-[#546E7A] italic text-xs focus:bg-[#EBF3FB]/50">
              MOCK: Owner (陳總監)
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#CFD8DC]/60" />
            <DropdownMenuItem className="text-[#B71C1C] text-sm focus:bg-red-50">
              登出
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
