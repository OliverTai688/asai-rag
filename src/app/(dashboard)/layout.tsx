"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const closeMobileSidebar = () => {
      if (desktopQuery.matches) {
        setMobileSidebarOpen(false);
      }
    };

    closeMobileSidebar();
    desktopQuery.addEventListener("change", closeMobileSidebar);
    return () => desktopQuery.removeEventListener("change", closeMobileSidebar);
  }, []);

  return (
    <Sheet
      open={mobileSidebarOpen}
      onOpenChange={(open) => setMobileSidebarOpen(open)}
    >
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
