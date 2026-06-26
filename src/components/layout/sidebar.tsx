"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Theater,
  CalendarDays,
  FileText,
  StickyNote,
  Users2,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Bot,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAssistantStore } from "@/domains/assistant/store";

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

type NavAction = {
  name: string;
  icon: LucideIcon;
  description: string;
  ariaLabel: string;
};

const assistantAction: NavAction = {
  name: "問誠問 AI",
  icon: Bot,
  description: "問網站、客戶與下一步",
  ariaLabel: "開啟誠問 AI 助手",
};

// Org-management surfaces (團隊管理 / 通訊處設定) are only reachable by org
// admins; a plain 業務員 (MEMBER/AGENT/COLLABORATOR) must not see the links.
const ORG_ADMIN_ROLES = new Set(["OWNER", "ADMIN", "MANAGER"]);
const TEAM_MANAGEMENT_HREFS = new Set(["/team", "/team/settings"]);

const navSections: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "今日",
    items: [{ name: "總覽", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "AI 工作台",
    items: [
      {
        name: "AI 了解客戶",
        href: "/interview",
        icon: MessageSquare,
        description: "訪談業務員、整理準備",
      },
      {
        name: "AI 劇場演練",
        href: "/theater",
        icon: Theater,
        description: "練異議、角色與說法",
      },
    ],
  },
  {
    label: "客戶工作",
    items: [
      { name: "客戶管理", href: "/crm", icon: Users },
      { name: "隨手筆記", href: "/notes", icon: StickyNote },
      { name: "訪前規劃", href: "/pre-visit", icon: CalendarDays },
      { name: "分析報告", href: "/reports", icon: FileText },
    ],
  },
  {
    label: "團隊與系統",
    items: [
      { name: "團隊管理", href: "/team", icon: Users2 },
      { name: "通訊處設定", href: "/team/settings", icon: Settings },
      { name: "個人設定", href: "/settings", icon: Settings },
    ],
  },
];

type SidebarProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  className?: string;
  mobile?: boolean;
  onNavigate?: () => void;
  role?: string;
};

export function Sidebar({
  open,
  setOpen,
  className,
  mobile = false,
  onNavigate,
  role,
}: SidebarProps) {
  const pathname = usePathname();
  const { isPanelOpen, togglePanel } = useAssistantStore();
  const canManageTeam = role ? ORG_ADMIN_ROLES.has(role) : false;
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => canManageTeam || !TEAM_MANAGEMENT_HREFS.has(item.href)
      ),
    }))
    .filter((section) => section.items.length > 0);
  const isNavItemActive = (href: string) => {
    if (pathname === href) return true;
    if (href === "/team" && pathname?.startsWith("/team/settings")) return false;
    return pathname?.startsWith(`${href}/`) ?? false;
  };

  return (
    <div
      id={mobile ? "mobile-sidebar" : undefined}
      className={cn(
        "relative z-40 flex h-full shrink-0 flex-col bg-card border-r border-hairline transition-all duration-300 ease-in-out motion-reduce:transition-none",
        open ? "w-60" : "w-[72px]",
        className
      )}
    >
      <div className="h-16 flex items-center justify-between px-5 border-b border-hairline">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          aria-label="回到總覽"
          className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <div className="w-8 h-8 rounded-md bg-[#1A3A6B] flex items-center justify-center shrink-0">
            <Sparkles className="text-[#C9A227] w-4 h-4" />
          </div>
          {open && (
            <div className="flex flex-col leading-none">
              <span className="font-semibold text-[15px] text-ink whitespace-nowrap tracking-tight">
                誠問 AI
              </span>
              <span className="text-[9px] text-ink-3 font-medium tracking-widest uppercase mt-0.5">
                Sincere Question
              </span>
            </div>
          )}
        </Link>
        {mobile && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(false)}
            aria-label="關閉導覽選單"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </Button>
        )}
      </div>

      <nav
        aria-label="主導覽"
        className={cn(
          "flex-1 overflow-y-auto py-4 px-3",
          open ? "space-y-4" : "space-y-5"
        )}
      >
        {visibleSections.map((section) => (
          <div key={section.label} className="space-y-1">
            {open && (
              <p className="px-3 pb-1 text-[10px] font-semibold tracking-widest text-ink-3">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <SidebarNavLink
                  key={item.href}
                  item={item}
                  active={isNavItemActive(item.href)}
                  open={open}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-hairline p-3 space-y-1">
        <PinnedAssistantButton
          action={assistantAction}
          active={isPanelOpen}
          open={open}
          mobile={mobile}
          setOpen={setOpen}
          onOpenAssistant={() => togglePanel(true)}
        />
        {!mobile && <SidebarCollapseButton open={open} setOpen={setOpen} />}
      </div>
    </div>
  );
}

function SidebarNavLink({
  item,
  active,
  open,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  open: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const label = item.description ? `${item.name}：${item.description}` : item.name;
  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-label={open ? undefined : label}
      className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <div className={navItemClasses(active)}>
        {active && <ActiveRail />}
        <Icon className={iconClasses(active)} strokeWidth={active ? 2 : 1.5} />
        {open && (
          <span className="min-w-0 text-[13px] tracking-tight">{item.name}</span>
        )}
      </div>
    </Link>
  );

  if (open) {
    return link;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function PinnedAssistantButton({
  action,
  active,
  open,
  mobile,
  setOpen,
  onOpenAssistant,
}: {
  action: NavAction;
  active: boolean;
  open: boolean;
  mobile: boolean;
  setOpen: (open: boolean) => void;
  onOpenAssistant: () => void;
}) {
  const Icon = action.icon;
  // Navy fill marks this as the site-wide assistant, distinct from the neutral
  // nav links above it. Lives in the footer so it reads as "ask across the app".
  const button = (
    <button
      type="button"
      onClick={() => {
        onOpenAssistant();
        if (mobile) {
          setOpen(false);
        }
      }}
      aria-label={action.ariaLabel}
      aria-pressed={active}
      className={cn(
        "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150 motion-reduce:transition-none",
        "bg-[#1A3A6B] text-white hover:bg-[#16315b]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active && "ring-2 ring-[#1A3A6B]/40 ring-offset-1 ring-offset-card",
        !open && "justify-center px-0"
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2 : 1.75} />
      {open && (
        <span className="min-w-0 text-[13px] font-semibold tracking-tight">
          {action.name}
        </span>
      )}
    </button>
  );

  if (open) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="right">
        {action.name}：{action.description}
      </TooltipContent>
    </Tooltip>
  );
}

function navItemClasses(active: boolean) {
  return cn(
    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 motion-reduce:transition-none",
    active
      ? "bg-paper-2 text-ink font-semibold"
      : "text-ink-3 hover:bg-paper-2 hover:text-ink"
  );
}

function iconClasses(active: boolean) {
  return cn(
    "w-[18px] h-[18px] shrink-0 transition-colors",
    active ? "text-[#1A3A6B]" : "text-ink-3 group-hover:text-ink"
  );
}

function ActiveRail() {
  return (
    <span className="absolute left-0 top-1/2 h-5 w-px -translate-y-1/2 rounded-r bg-[#1A3A6B]" />
  );
}

function SidebarCollapseButton({
  open,
  setOpen,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  const label = open ? "縮小側欄" : "展開側欄";
  const button = (
    <Button
      variant="ghost"
      size="sm"
      className="w-full justify-center rounded-lg text-[12px]"
      onClick={() => setOpen(!open)}
      aria-label={label}
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
  );

  if (open) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}
