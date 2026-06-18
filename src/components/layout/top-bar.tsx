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

export function TopBar({
  onMenuClick,
  mobileMenuOpen = false,
}: {
  onMenuClick: () => void;
  mobileMenuOpen?: boolean;
}) {
  return (
    <header className="relative h-16 flex items-center justify-between px-5 md:px-6 bg-paper/90 backdrop-blur-sm border-b border-hairline z-30 shrink-0">
      <div className="flex items-center gap-4 flex-1 relative">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuClick}
          aria-label="開啟導覽選單"
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-sidebar"
        >
          <Menu className="w-5 h-5" strokeWidth={1.5} />
        </Button>
        <div className="relative max-w-sm w-full hidden md:block">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3 z-10"
            strokeWidth={1.5}
          />
          <Input
            placeholder="搜尋客戶、對話或報告 (⌘K)"
            className="pl-9 h-9 bg-paper-2 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 relative">
        {/* Notifications */}
        <NotificationHub />

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                aria-label="開啟使用者選單"
                className="inline-flex h-10 items-center gap-2.5 rounded-lg px-2.5 transition-colors hover:bg-paper-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            }
          >
              <div className="w-8 h-8 rounded-md bg-[#1A3A6B] flex items-center justify-center">
                <User className="text-white w-4 h-4" strokeWidth={1.5} />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-[13px] font-semibold text-ink leading-none mb-1">王小明</p>
                <p className="text-[11px] text-ink-3 font-medium">台北一區 · Agent</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-ink-3" strokeWidth={1.5} />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 mt-2 rounded-lg border-hairline bg-card shadow-[0_14px_40px_rgba(0,0,0,0.08)]"
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
              我的身份
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-hairline" />
            <DropdownMenuItem className="py-2.5 focus:bg-accent">
              <div className="flex flex-col">
                <span className="font-semibold text-ink text-sm">王小明</span>
                <span className="text-xs text-muted-foreground">業務部 | 加值服務專員</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-hairline" />
            <DropdownMenuItem className="py-2 focus:bg-accent text-muted-foreground text-sm">
              切換角色
            </DropdownMenuItem>
            <DropdownMenuItem className="text-muted-foreground italic text-xs focus:bg-accent">
              MOCK: Manager (張大壯)
            </DropdownMenuItem>
            <DropdownMenuItem className="text-muted-foreground italic text-xs focus:bg-accent">
              MOCK: Owner (陳總監)
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-hairline" />
            <DropdownMenuItem className="text-[#B71C1C] text-sm focus:bg-red-50 dark:focus:bg-[#B71C1C]/15">
              登出
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
