"use client";

import { useTransition } from "react";
import { Menu, User, ChevronDown, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationHub } from "./notification-hub";
import { signOutAction, switchDemoAccountAction } from "@/lib/auth/session-actions";
import { GlobalSearch } from "./global-search";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export type TopBarViewer = {
  name: string;
  email: string;
  role: string;
  organizationName: string;
  unitName: string | null;
};

export type TopBarSwitchAccount = {
  email: string;
  label: string;
};

const ROLE_LABELS: Record<string, string> = {
  OWNER: "負責人",
  ADMIN: "管理員",
  MANAGER: "主管",
  MEMBER: "業務員",
  AGENT: "業務員",
  COLLABORATOR: "協作者",
};

function roleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role;
}

export function TopBar({
  onMenuClick,
  mobileMenuOpen = false,
  viewer,
  switchAccounts = [],
}: {
  onMenuClick: () => void;
  mobileMenuOpen?: boolean;
  viewer?: TopBarViewer;
  switchAccounts?: TopBarSwitchAccount[];
}) {
  const [isPending, startTransition] = useTransition();

  const displayName = viewer?.name ?? "使用者";
  const secondaryLine = viewer
    ? `${viewer.unitName ?? viewer.organizationName} · ${roleLabel(viewer.role)}`
    : "";
  const otherAccounts = switchAccounts.filter(
    (account) => account.email !== viewer?.email
  );

  function handleSwitch(email: string) {
    startTransition(async () => {
      await switchDemoAccountAction(email);
    });
  }

  function handleSignOut() {
    startTransition(async () => {
      await signOutAction();
    });
  }

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
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2 relative">
        {/* Theme toggle (dark default) */}
        <ThemeToggle />

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
                <p className="text-[13px] font-semibold text-ink leading-none mb-1">{displayName}</p>
                <p className="text-[11px] text-ink-3 font-medium">{secondaryLine}</p>
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
            <DropdownMenuItem className="py-2.5 focus:bg-accent" disabled>
              <div className="flex flex-col">
                <span className="font-semibold text-ink text-sm">{displayName}</span>
                {viewer ? (
                  <span className="text-xs text-muted-foreground">
                    {viewer.email} · {roleLabel(viewer.role)}
                  </span>
                ) : null}
              </div>
            </DropdownMenuItem>

            {otherAccounts.length > 0 ? (
              <>
                <DropdownMenuSeparator className="bg-hairline" />
                <DropdownMenuLabel className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">
                  切換體驗角色
                </DropdownMenuLabel>
                {otherAccounts.map((account) => (
                  <DropdownMenuItem
                    key={account.email}
                    className="text-sm focus:bg-accent"
                    disabled={isPending}
                    onClick={() => handleSwitch(account.email)}
                  >
                    {account.label}
                  </DropdownMenuItem>
                ))}
              </>
            ) : null}

            <DropdownMenuSeparator className="bg-hairline" />
            <DropdownMenuItem
              className="text-[#B71C1C] text-sm focus:bg-red-50 dark:focus:bg-[#B71C1C]/15"
              disabled={isPending}
              onClick={() => handleSignOut()}
            >
              <LogOut className="w-4 h-4" strokeWidth={1.5} />
              登出
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
