"use client";

import { Bell, Search, Menu, User, ChevronDown } from "lucide-react";
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
      className="h-16 flex items-center justify-between px-6 bg-white dark:bg-[#0F2744] z-30 shrink-0"
      style={{ borderBottom: "1px solid #CFD8DC", boxShadow: "0 1px 0 0 #CFD8DC" }}
    >
      {/* Gold accent line at very bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{ background: "linear-gradient(90deg, #B8860B 0%, #D4A017 40%, #C9A227 60%, #B8860B 100%)", opacity: 0.6 }}
      />

      <div className="flex items-center gap-4 flex-1 relative">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden text-[#546E7A] hover:text-[#0A2342] hover:bg-[#EBF3FB]"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5" strokeWidth={1.5} />
        </Button>
        <div className="relative max-w-sm w-full hidden md:block">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#546E7A]"
            strokeWidth={1.5}
          />
          <Input
            placeholder="搜尋客戶、對話或報告 (⌘K)"
            className="pl-9 h-9 bg-[#F7FAFF] dark:bg-[#1A3A6B]/20 border-[#CFD8DC] dark:border-[rgba(144,202,249,0.2)] rounded-xl text-sm text-[#0A1929] placeholder:text-[#546E7A] focus-visible:border-[#1565C0] focus-visible:ring-[#1565C0]/20"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 relative">
        {/* Notifications */}
        <NotificationHub />

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className="inline-flex items-center h-10 gap-2.5 px-3 hover:bg-[#EBF3FB] dark:hover:bg-[#1A3A6B]/30 rounded-xl cursor-pointer transition-colors">
              <div className="w-8 h-8 rounded-lg bg-[#1A3A6B] flex items-center justify-center shadow-sm">
                <User className="text-white w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[13px] font-semibold text-[#0A2342] dark:text-white leading-none mb-1">王小明</p>
                <p className="text-[10px] text-[#546E7A] dark:text-[#90CAF9] font-medium">台北一區 · Agent</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#546E7A]" strokeWidth={1.5} />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 mt-2 rounded-xl border-[#CFD8DC] dark:border-[rgba(144,202,249,0.15)] bg-white dark:bg-[#0F2744] shadow-lg"
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
