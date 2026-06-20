"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";
import {
  Activity,
  ArrowLeftRight,
  Bot,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleAlert,
  CreditCard,
  FileText,
  Gauge,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  MessageSquareText,
  Network,
  Send,
  Settings,
  Theater,
  UserCog,
  Users,
  Users2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAssistantStore } from "@/domains/assistant/store";
import type {
  WorkspaceSidebarRenderItem,
  WorkspaceSidebarRenderModel,
  WorkspaceSidebarRenderSurfaceSwitch,
} from "@/lib/navigation/workspace-sidebar";
import { cn } from "@/lib/utils";

export type RoleAwareSidebarNavigation = {
  member: WorkspaceSidebarRenderModel;
  orgAdmin: WorkspaceSidebarRenderModel;
};

type RoleAwareSidebarProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
  mobile?: boolean;
  navigation: RoleAwareSidebarNavigation;
  className?: string;
  onNavigate?: () => void;
};

const disabledReasonLabels: Record<string, string> = {
  AI_DISABLED: "AI 功能目前未啟用",
  FEATURE_FLAG_OFF: "功能尚未開放",
  PLAN_UPGRADE_REQUIRED: "需要升級方案",
  QUOTA_EXCEEDED: "AI 額度已用完",
  ROLE_RESTRICTED: "目前角色無法使用",
  SURFACE_MISMATCH: "請切換工作台",
  UNIT_SCOPE_REQUIRED: "需要通訊處管理範圍",
};

function SidebarIcon({ name }: { name: string }) {
  const iconProps = {
    className: "h-4 w-4 shrink-0",
    "aria-hidden": true,
  } as const;

  switch (name) {
    case "Activity":
      return <Activity {...iconProps} />;
    case "ArrowLeftRight":
      return <ArrowLeftRight {...iconProps} />;
    case "Bot":
      return <Bot {...iconProps} />;
    case "Building2":
      return <Building2 {...iconProps} />;
    case "CalendarDays":
      return <CalendarDays {...iconProps} />;
    case "CircleAlert":
      return <CircleAlert {...iconProps} />;
    case "CreditCard":
      return <CreditCard {...iconProps} />;
    case "FileText":
      return <FileText {...iconProps} />;
    case "Gauge":
      return <Gauge {...iconProps} />;
    case "LayoutDashboard":
      return <LayoutDashboard {...iconProps} />;
    case "ListChecks":
      return <ListChecks {...iconProps} />;
    case "MessageSquare":
      return <MessageSquare {...iconProps} />;
    case "MessageSquareText":
      return <MessageSquareText {...iconProps} />;
    case "Network":
      return <Network {...iconProps} />;
    case "Send":
      return <Send {...iconProps} />;
    case "Settings":
      return <Settings {...iconProps} />;
    case "Theater":
      return <Theater {...iconProps} />;
    case "UserCog":
      return <UserCog {...iconProps} />;
    case "Users":
      return <Users {...iconProps} />;
    case "Users2":
      return <Users2 {...iconProps} />;
    default:
      return <Circle {...iconProps} />;
  }
}

function normalizePath(pathname: string | null | undefined): string {
  if (!pathname) {
    return "/";
  }

  return pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
}

function itemMatchesPath(item: WorkspaceSidebarRenderItem, pathname: string): boolean {
  if (item.action.type !== "href") {
    return false;
  }

  const href = normalizePath(item.action.href);

  if (item.action.activeMatch === "team-root-excluding-settings") {
    return (
      pathname === href ||
      (pathname.startsWith(`${href}/`) && !pathname.startsWith("/team/settings"))
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function selectRoleAwareSidebarModel(
  navigation: RoleAwareSidebarNavigation,
  pathname: string | null | undefined,
): WorkspaceSidebarRenderModel {
  const currentPath = normalizePath(pathname);

  if (currentPath.startsWith("/team") && navigation.orgAdmin.currentSurface === "orgAdmin") {
    return navigation.orgAdmin;
  }

  return navigation.member;
}

function labelForDisabledReason(reason: string | null): string | null {
  if (!reason) {
    return null;
  }

  return disabledReasonLabels[reason] ?? reason;
}

function activeSectionItem(
  item: WorkspaceSidebarRenderItem,
  pathname: string,
  model: WorkspaceSidebarRenderModel,
): boolean {
  if (item.id === model.activeItemId) {
    return true;
  }

  return itemMatchesPath(item, pathname);
}

function triggerWithTooltip(
  trigger: ReactElement,
  label: string,
  disabledReason: string | null,
  collapsed: boolean,
) {
  if (!collapsed && !disabledReason) {
    return trigger;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={trigger} />
      <TooltipContent side="right" className="max-w-60">
        {disabledReason ?? label}
      </TooltipContent>
    </Tooltip>
  );
}

function navItemClasses(open: boolean, active: boolean, unavailable: boolean): string {
  return cn(
    "group relative flex min-h-10 w-full items-center gap-3 rounded-sm px-3 text-sm font-medium text-muted-foreground transition-colors motion-reduce:transition-none",
    open ? "justify-start" : "justify-center",
    active && "bg-ink text-paper",
    !active && !unavailable && "hover:bg-muted hover:text-ink",
    unavailable && "cursor-not-allowed text-muted-foreground/55",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
  );
}

function ActiveRail({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }

  return <span className="absolute left-0 top-1/2 h-5 w-px -translate-y-1/2 bg-primary" />;
}

function ItemBadge({ badge, open }: { badge: string | undefined; open: boolean }) {
  if (!badge || !open) {
    return null;
  }

  return (
    <span className="ml-auto rounded-sm border border-hairline px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground group-data-[active=true]:border-paper/40 group-data-[active=true]:text-paper/75">
      {badge}
    </span>
  );
}

function SidebarItem({
  item,
  open,
  active,
  onNavigate,
}: {
  item: WorkspaceSidebarRenderItem;
  open: boolean;
  active: boolean;
  onNavigate: () => void;
}) {
  const disabledReason = labelForDisabledReason(item.disabledReason ?? null);
  const unavailable = item.disabled || Boolean(disabledReason);
  const content = (
    <>
      <ActiveRail active={active} />
      <SidebarIcon name={item.icon} />
      {open ? (
        <>
          <span className="min-w-0 truncate">{item.label}</span>
          <ItemBadge badge={item.badge} open={open} />
        </>
      ) : null}
    </>
  );

  if (item.action.type === "href" && !unavailable) {
    const link = (
      <Link
        href={item.action.href}
        aria-current={active ? "page" : undefined}
        aria-label={open ? undefined : item.ariaLabel}
        className={navItemClasses(open, active, false)}
        data-active={active ? "true" : undefined}
        data-sidebar-boundary={item.dataBoundary}
        data-sidebar-item={item.id}
        onClick={onNavigate}
      >
        {content}
      </Link>
    );

    return triggerWithTooltip(link, item.label, null, !open);
  }

  if (item.action.type === "openAssistant" && !unavailable) {
    const button = (
      <button
        type="button"
        aria-label={open ? undefined : item.ariaLabel}
        className={navItemClasses(open, active, false)}
        data-active={active ? "true" : undefined}
        data-assistant-scope={item.action.assistantScope}
        data-sidebar-boundary={item.dataBoundary}
        data-sidebar-item={item.id}
        onClick={() => {
          useAssistantStore.getState().togglePanel(true);
          onNavigate();
        }}
      >
        {content}
      </button>
    );

    return triggerWithTooltip(button, item.label, null, !open);
  }

  const button = (
    <button
      type="button"
      aria-disabled="true"
      aria-label={open ? undefined : item.ariaLabel}
      className={navItemClasses(open, active, true)}
      data-active={active ? "true" : undefined}
      data-sidebar-boundary={item.dataBoundary}
      data-sidebar-disabled-reason={item.disabledReason ?? undefined}
      data-sidebar-item={item.id}
    >
      {content}
    </button>
  );

  return triggerWithTooltip(button, item.label, disabledReason, !open);
}

function SurfaceSwitch({
  surfaceSwitch,
  open,
  onNavigate,
}: {
  surfaceSwitch: WorkspaceSidebarRenderSurfaceSwitch;
  open: boolean;
  onNavigate: () => void;
}) {
  const iconName = surfaceSwitch.id === "org-admin" ? "Building2" : "LayoutDashboard";
  const disabledReason = labelForDisabledReason(surfaceSwitch.disabledReason ?? null);
  const isUnavailable = !surfaceSwitch.action.available;
  const isCurrent = surfaceSwitch.action.current;
  const content = (
    <>
      <ActiveRail active={isCurrent} />
      <SidebarIcon name={iconName} />
      {open ? <span className="min-w-0 truncate">{surfaceSwitch.label}</span> : null}
    </>
  );

  if (!isUnavailable && !isCurrent) {
    const link = (
      <Link
        href={surfaceSwitch.action.href}
        aria-label={open ? undefined : surfaceSwitch.ariaLabel}
        className={navItemClasses(open, false, false)}
        data-sidebar-surface-switch={surfaceSwitch.id}
        onClick={onNavigate}
      >
        {content}
      </Link>
    );

    return triggerWithTooltip(link, surfaceSwitch.label, null, !open);
  }

  const button = (
    <button
      type="button"
      aria-current={isCurrent ? "page" : undefined}
      aria-disabled={isUnavailable || isCurrent ? "true" : undefined}
      aria-label={open ? undefined : surfaceSwitch.ariaLabel}
      className={navItemClasses(open, isCurrent, isUnavailable)}
      data-active={isCurrent ? "true" : undefined}
      data-sidebar-disabled-reason={surfaceSwitch.disabledReason ?? undefined}
      data-sidebar-surface-switch={surfaceSwitch.id}
    >
      {content}
    </button>
  );

  return triggerWithTooltip(button, surfaceSwitch.label, disabledReason, !open);
}

function SurfaceSwitches({
  model,
  open,
  onNavigate,
}: {
  model: WorkspaceSidebarRenderModel;
  open: boolean;
  onNavigate: () => void;
}) {
  if (model.surfaceSwitches.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-hairline px-3 py-3">
      {open ? (
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          工作台
        </p>
      ) : null}
      <div className="space-y-1">
        {model.surfaceSwitches.map((surfaceSwitch) => (
          <SurfaceSwitch
            key={surfaceSwitch.id}
            surfaceSwitch={surfaceSwitch}
            open={open}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

export function RoleAwareSidebar({
  open,
  setOpen,
  mobile = false,
  navigation,
  className,
  onNavigate,
}: RoleAwareSidebarProps) {
  const pathname = usePathname();
  const currentPath = normalizePath(pathname);
  const model = selectRoleAwareSidebarModel(navigation, currentPath);
  const widthClass = mobile ? "w-full" : open ? "w-60" : "w-20";
  const handleNavigate = () => {
    if (mobile) {
      setOpen(false);
    }

    onNavigate?.();
  };

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-hairline bg-background text-foreground transition-[width] duration-200 motion-reduce:transition-none",
        widthClass,
        className,
      )}
      data-sidebar-surface={model.currentSurface}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-hairline px-4",
          open ? "justify-between" : "justify-center",
        )}
      >
        {open ? (
          <Link href="/dashboard" className="min-w-0" onClick={handleNavigate}>
            <p className="text-sm font-semibold leading-none text-ink">誠問 AI</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {model.currentSurface === "orgAdmin" ? "通訊處工作台" : "顧問工作台"}
            </p>
          </Link>
        ) : (
          <Link
            href="/dashboard"
            aria-label="返回總覽"
            className="flex h-10 w-10 items-center justify-center rounded-sm border border-hairline text-sm font-semibold text-ink"
            onClick={handleNavigate}
          >
            誠
          </Link>
        )}

        {mobile ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label="關閉導覽"
            className="h-9 w-9"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        aria-label={model.currentSurface === "orgAdmin" ? "通訊處工作台導覽" : "顧問工作台導覽"}
      >
        <div className="space-y-5">
          {model.primarySections.map((section) => (
            <div key={section.id} data-sidebar-section={section.id}>
              {open ? (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {section.label}
                </p>
              ) : (
                <div className="mb-2 h-px bg-hairline" aria-hidden="true" />
              )}
              <div className="space-y-1">
                {section.items.map((item) => (
                  <SidebarItem
                    key={item.id}
                    item={item}
                    open={open}
                    active={activeSectionItem(item, currentPath, model)}
                    onNavigate={handleNavigate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <SurfaceSwitches model={model} open={open} onNavigate={handleNavigate} />

      {!mobile ? (
        <div className="border-t border-hairline p-3">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size={open ? "sm" : "icon"}
                  className={cn("w-full", open ? "justify-start gap-2" : "h-10 w-full")}
                  aria-label={open ? "收合側邊欄" : "展開側邊欄"}
                  onClick={() => setOpen(!open)}
                >
                  {open ? (
                    <>
                      <ChevronLeft className="h-4 w-4" />
                      收合
                    </>
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              }
            />
            <TooltipContent side="right">{open ? "收合側邊欄" : "展開側邊欄"}</TooltipContent>
          </Tooltip>
        </div>
      ) : null}
    </aside>
  );
}
