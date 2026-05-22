"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { GlobalAssistant } from "@/components/assistant/global-assistant";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#0A1929] overflow-hidden relative">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />

      {/* Global Assistant Sidebar Column */}
      <GlobalAssistant />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto p-5 md:p-6 custom-scrollbar">
          <div className="max-w-[1320px] mx-auto space-y-6 animate-page-enter">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
