"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { GlobalAssistant } from "@/components/assistant/global-assistant";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isQuickstart = useQuickstartMode();

  useEffect(() => {
    if (isQuickstart) {
      setMobileSidebarOpen(false);
      return;
    }

    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const closeMobileSidebar = () => {
      if (desktopQuery.matches) {
        setMobileSidebarOpen(false);
      }
    };

    closeMobileSidebar();
    desktopQuery.addEventListener("change", closeMobileSidebar);
    return () => desktopQuery.removeEventListener("change", closeMobileSidebar);
  }, [isQuickstart]);

  if (isQuickstart) {
    return (
      <div className="flex h-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#0A1929]">
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <QuickstartTopBar pathname={pathname} />
          <main className="flex-1 overflow-y-auto px-3 py-4 custom-scrollbar md:px-6 md:py-5">
            <div className="mx-auto max-w-[1120px] space-y-4 animate-page-enter">
              {children}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
      <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0A1929] overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar
          open={desktopSidebarOpen}
          setOpen={setDesktopSidebarOpen}
          className="hidden lg:flex"
        />

        <SheetContent
          side="left"
          showCloseButton={false}
          className="w-[280px] max-w-[82vw] gap-0 border-[#D8E1EA] bg-white p-0 dark:border-[rgba(144,202,249,0.15)] dark:bg-[#0F2744] lg:hidden"
        >
          <SheetTitle className="sr-only">主選單</SheetTitle>
          <Sidebar
            open
            setOpen={setMobileSidebarOpen}
            mobile
            onNavigate={() => setMobileSidebarOpen(false)}
            className="w-full border-r-0"
          />
        </SheetContent>

        {/* Global Assistant Sidebar Column */}
        <GlobalAssistant />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <TopBar
            mobileMenuOpen={mobileSidebarOpen}
            onMenuClick={() => setMobileSidebarOpen(true)}
          />
          <main className="flex-1 overflow-y-auto p-5 md:p-6 custom-scrollbar">
            <div className="max-w-[1320px] mx-auto space-y-6 animate-page-enter">
              {children}
            </div>
          </main>
        </div>
      </div>
    </Sheet>
  );
}

function QuickstartTopBar({ pathname }: { pathname: string }) {
  const isDashboard = pathname === "/dashboard";

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-[#D8E1EA] bg-white/95 px-4 backdrop-blur md:px-6 dark:border-[rgba(144,202,249,0.15)] dark:bg-[#0F2744]/95">
      <Link
        href="/dashboard"
        className="flex items-center gap-2 text-sm font-semibold text-[#0A2342] transition-colors hover:text-[#1565C0] dark:text-white"
      >
        <span className="grid size-8 place-items-center rounded-lg bg-[#173762] text-[12px] font-bold text-white shadow-sm">
          A
        </span>
        ASAI Quickstart
      </Link>

      <div className="hidden items-center gap-2 rounded-full border border-[#D8E1EA] bg-[#F8FAFC] px-3 py-1.5 text-xs font-semibold text-[#546E7A] sm:flex dark:border-[rgba(144,202,249,0.15)] dark:bg-[#1A3A6B]/30 dark:text-[#B8D7F5]">
        <span className="size-2 rounded-full bg-[#2E7D32]" />
        {isDashboard ? "歡迎導覽" : "專注體驗中"}
      </div>

      <Link
        href="/dashboard"
        className="rounded-lg border border-[#D8E1EA] bg-white px-3 py-2 text-xs font-semibold text-[#546E7A] shadow-sm transition-colors hover:border-[#1565C0] hover:text-[#0A2342] dark:border-[rgba(144,202,249,0.15)] dark:bg-[#0F2744] dark:text-[#B8D7F5]"
      >
        離開體驗
      </Link>
    </header>
  );
}

function useQuickstartMode() {
  return useSyncExternalStore(
    subscribeToLocationChanges,
    getQuickstartSnapshot,
    () => false
  );
}

function getQuickstartSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  const demoMode = new URLSearchParams(window.location.search).get("demo");
  return demoMode === "quickstart" || demoMode === "completed";
}

function subscribeToLocationChanges(onStoreChange: () => void) {
  const originalPushState = window.history.pushState.bind(
    window.history
  ) as History["pushState"];
  const originalReplaceState = window.history.replaceState.bind(
    window.history
  ) as History["replaceState"];
  const urlChangeEvent = "asai-url-change";
  const emitUrlChange = () => window.dispatchEvent(new Event(urlChangeEvent));
  const patchedPushState: History["pushState"] = (...args) => {
    const result = originalPushState(...args);
    emitUrlChange();
    return result;
  };
  const patchedReplaceState: History["replaceState"] = (...args) => {
    const result = originalReplaceState(...args);
    emitUrlChange();
    return result;
  };

  window.history.pushState = patchedPushState;
  window.history.replaceState = patchedReplaceState;
  window.addEventListener("popstate", onStoreChange);
  window.addEventListener(urlChangeEvent, onStoreChange);

  return () => {
    window.removeEventListener("popstate", onStoreChange);
    window.removeEventListener(urlChangeEvent, onStoreChange);
    if (window.history.pushState === patchedPushState) {
      window.history.pushState = originalPushState;
    }
    if (window.history.replaceState === patchedReplaceState) {
      window.history.replaceState = originalReplaceState;
    }
  };
}
