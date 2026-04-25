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
import { Badge } from "@/components/ui/badge";

import { NotificationHub } from "./notification-hub";

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 z-30">
      <div className="flex items-center gap-4 flex-1">
        <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
          <Menu className="w-5 h-5" />
        </Button>
        <div className="relative max-w-md w-full hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="搜尋客戶、對話或報告 (⌘K)"
            className="pl-10 h-10 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <NotificationHub />

        {/* User Profile / Role Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className="inline-flex items-center h-10 gap-3 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl cursor-pointer transition-colors">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <User className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold leading-none mb-1">王小明 (Agent)</p>
                <p className="text-[10px] text-zinc-500 font-medium">台北一區</p>
              </div>
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl border-zinc-200 dark:border-zinc-800">
            <DropdownMenuLabel>我的身份</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="py-2.5">
              <div className="flex flex-col">
                <span className="font-semibold">王小明</span>
                <span className="text-xs text-zinc-500">業務部 | 加值服務專員</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="py-2.5">
              <span className="text-zinc-500">切換角色</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="text-zinc-500 italic text-xs">
              MOCK: Manager (張大壯)
            </DropdownMenuItem>
            <DropdownMenuItem className="text-zinc-500 italic text-xs">
              MOCK: Owner (陳總監)
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-500">登出</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
