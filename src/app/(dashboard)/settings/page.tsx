"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  ChevronRight,
  Check,
  Moon,
  Sun,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "profile", label: "個人資料", icon: User },
  { id: "notifications", label: "通知設定", icon: Bell },
  { id: "appearance", label: "外觀主題", icon: Palette },
  { id: "language", label: "語言與地區", icon: Globe },
  { id: "security", label: "安全性", icon: Shield },
  { id: "data", label: "資料管理", icon: Database },
];

const NOTIFICATION_SETTINGS = [
  { id: "report_opened", label: "報告被開啟時通知", description: "客戶瀏覽分享報告時推送提醒", enabled: true },
  { id: "spin_reminder", label: "SPIN 對話提醒", description: "超過 7 天未聯繫客戶時提醒", enabled: true },
  { id: "team_updates", label: "團隊動態更新", description: "成員達成業績里程碑時通知", enabled: false },
  { id: "ai_tips", label: "AI 每日洞察", description: "每日早上推送一則銷售建議", enabled: true },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [notifications, setNotifications] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_SETTINGS.map((n) => [n.id, n.enabled]))
  );

  const toggleNotification = (id: string) => {
    setNotifications((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold">系統設定</h1>
        <p className="text-zinc-500 font-medium">管理個人偏好、安全性與資料設定。</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm h-fit">
          <CardContent className="p-3 space-y-1">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all",
                  activeSection === section.id
                    ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 font-semibold"
                    : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                <section.icon className="w-4 h-4 shrink-0" />
                <span className="text-sm">{section.label}</span>
                {activeSection === section.id && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {activeSection === "profile" && (
            <>
              <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">個人資料</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black">
                      王
                    </div>
                    <div>
                      <p className="font-bold">王小明</p>
                      <p className="text-sm text-zinc-500">業務部 · 加值服務專員</p>
                      <Button variant="outline" size="sm" className="mt-2 rounded-xl text-xs font-bold border-zinc-200">
                        更換頭像
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { label: "姓名", value: "王小明" },
                      { label: "工號", value: "AG-2024-001" },
                      { label: "所屬區域", value: "台北一區" },
                      { label: "電子郵件", value: "wang@sincerely.ai" },
                    ].map((field) => (
                      <div key={field.label}>
                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                          {field.label}
                        </label>
                        <div className="h-10 px-4 flex items-center bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
                          <span className="text-sm font-medium">{field.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end">
                    <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold">
                      儲存變更
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeSection === "notifications" && (
            <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">通知設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {NOTIFICATION_SETTINGS.map((setting) => (
                  <div
                    key={setting.id}
                    className="flex items-center justify-between p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-sm">{setting.label}</p>
                      <p className="text-xs text-zinc-500 font-medium mt-0.5">{setting.description}</p>
                    </div>
                    <button
                      onClick={() => toggleNotification(setting.id)}
                      className={cn(
                        "w-11 h-6 rounded-full transition-all relative shrink-0",
                        notifications[setting.id] ? "bg-indigo-600" : "bg-zinc-200 dark:bg-zinc-700"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all",
                          notifications[setting.id] ? "left-[22px]" : "left-0.5"
                        )}
                      />
                    </button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {activeSection === "appearance" && (
            <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">外觀主題</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-zinc-500 font-medium">選擇您偏好的介面主題。</p>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { id: "light", label: "淺色", icon: Sun },
                    { id: "dark", label: "深色", icon: Moon },
                    { id: "system", label: "跟隨系統", icon: Monitor },
                  ] as const).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={cn(
                        "flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all",
                        theme === t.id
                          ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20"
                          : "border-zinc-100 dark:border-zinc-800 hover:border-indigo-200"
                      )}
                    >
                      <t.icon
                        className={cn("w-6 h-6", theme === t.id ? "text-indigo-600" : "text-zinc-400")}
                      />
                      <span className={cn("text-sm font-bold", theme === t.id ? "text-indigo-600" : "text-zinc-500")}>
                        {t.label}
                      </span>
                      {theme === t.id && (
                        <span className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(activeSection === "language" || activeSection === "security" || activeSection === "data") && (
            <Card className="rounded-3xl border-zinc-200 dark:border-zinc-800 shadow-sm">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                  <Settings className="w-7 h-7 text-zinc-400 animate-spin [animation-duration:4s]" />
                </div>
                <div>
                  <p className="font-bold text-lg">功能建置中</p>
                  <p className="text-sm text-zinc-500 font-medium mt-1">此設定模組即將上線，敬請期待。</p>
                </div>
                <Badge variant="outline" className="text-xs border-zinc-200 text-zinc-400 font-bold uppercase tracking-wider">
                  Coming Soon
                </Badge>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
