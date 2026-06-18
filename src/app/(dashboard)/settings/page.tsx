"use client";

import { useState } from "react";
import {
  Bell,
  Check,
  Database,
  Globe,
  KeyRound,
  Monitor,
  Moon,
  Palette,
  Shield,
  Sun,
  User,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "profile", label: "個人資料", icon: User },
  { id: "notifications", label: "通知", icon: Bell },
  { id: "appearance", label: "外觀", icon: Palette },
  { id: "language", label: "語言", icon: Globe },
  { id: "security", label: "安全", icon: Shield },
  { id: "data", label: "資料", icon: Database },
] as const;

const NOTIFICATION_SETTINGS = [
  { id: "report_opened", label: "報告被開啟時通知", description: "客戶瀏覽分享報告時推送提醒", enabled: true },
  { id: "spin_reminder", label: "SPIN 對話提醒", description: "超過 7 天未聯繫客戶時提醒", enabled: true },
  { id: "team_updates", label: "團隊動態更新", description: "成員達成業績里程碑時通知", enabled: false },
  { id: "ai_tips", label: "AI 每日洞察", description: "每日早上推送一則銷售建議", enabled: true },
];

type SectionId = (typeof SECTIONS)[number]["id"];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("profile");
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");
  const [notifications, setNotifications] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIFICATION_SETTINGS.map((setting) => [setting.id, setting.enabled]))
  );

  const activeLabel = SECTIONS.find((section) => section.id === activeSection)?.label ?? "設定";

  const toggleNotification = (id: string) => {
    setNotifications((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-hairline pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <Badge variant="outline" className="w-fit rounded-full border-hairline text-[11px]">
            Workspace preferences
          </Badge>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">系統設定</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              管理個人偏好、通知、安全與本機 demo 資料。
            </p>
          </div>
        </div>
        <Button variant="mono" className="h-10 w-fit">
          儲存變更
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="border-hairline bg-card">
          <CardContent className="p-2">
            <nav className="grid gap-1" aria-label="設定分類">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex min-h-10 items-center gap-3 rounded-md px-3 text-left text-sm transition-colors",
                    activeSection === section.id
                      ? "bg-ink text-paper"
                      : "text-muted-foreground hover:bg-muted hover:text-ink"
                  )}
                  aria-pressed={activeSection === section.id}
                >
                  <section.icon className="size-4 shrink-0" />
                  {section.label}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-ink">{activeLabel}</h2>
              <p className="text-sm text-muted-foreground">設定只作用於目前 demo workspace。</p>
            </div>
          </div>

          {activeSection === "profile" ? <ProfilePanel /> : null}
          {activeSection === "notifications" ? (
            <NotificationsPanel notifications={notifications} onToggle={toggleNotification} />
          ) : null}
          {activeSection === "appearance" ? (
            <AppearancePanel theme={theme} onThemeChange={setTheme} />
          ) : null}
          {activeSection === "language" ? <LanguagePanel /> : null}
          {activeSection === "security" ? <SecurityPanel /> : null}
          {activeSection === "data" ? <DataPanel /> : null}
        </section>
      </div>
    </div>
  );
}

function ProfilePanel() {
  const fields = [
    { label: "姓名", value: "王小明" },
    { label: "工號", value: "AG-2024-001" },
    { label: "所屬區域", value: "台北一區" },
    { label: "電子郵件", value: "wang@sincerely.ai" },
  ];

  return (
    <Card className="border-hairline bg-card">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex size-14 items-center justify-center rounded-full border border-hairline bg-paper text-lg font-semibold text-ink">
            王
          </div>
          <div>
            <p className="font-semibold text-ink">王小明</p>
            <p className="text-sm text-muted-foreground">業務部・加值服務專員</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.label} className="rounded-md border border-hairline bg-paper px-3 py-2">
              <p className="text-xs text-muted-foreground">{field.label}</p>
              <p className="mt-1 text-sm font-medium text-ink">{field.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationsPanel({
  notifications,
  onToggle,
}: {
  notifications: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <Card className="border-hairline bg-card">
      <CardContent className="divide-y divide-hairline p-0">
        {NOTIFICATION_SETTINGS.map((setting) => (
          <div key={setting.id} className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm font-medium text-ink">{setting.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{setting.description}</p>
            </div>
            <SwitchButton
              checked={notifications[setting.id]}
              onClick={() => onToggle(setting.id)}
              label={setting.label}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AppearancePanel({
  theme,
  onThemeChange,
}: {
  theme: "light" | "dark" | "system";
  onThemeChange: (theme: "light" | "dark" | "system") => void;
}) {
  const options = [
    { id: "light", label: "淺色", icon: Sun },
    { id: "dark", label: "深色", icon: Moon },
    { id: "system", label: "跟隨系統", icon: Monitor },
  ] as const;

  return (
    <Card className="border-hairline bg-card">
      <CardContent className="grid gap-3 p-5 sm:grid-cols-3">
        {options.map((option) => (
          <ChoiceButton
            key={option.id}
            active={theme === option.id}
            icon={option.icon}
            label={option.label}
            onClick={() => onThemeChange(option.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function LanguagePanel() {
  return (
    <Card className="border-hairline bg-card">
      <CardContent className="space-y-4 p-5">
        <SettingRow title="介面語言" description="目前產品僅支援繁體中文（zh-TW）。" value="繁體中文" />
        <SettingRow title="地區格式" description="日期、貨幣與報告格式使用台灣設定。" value="台灣" />
        <SettingRow title="產品名稱" description="所有介面維持誠問 AI 品牌語言。" value="誠問 AI" />
      </CardContent>
    </Card>
  );
}

function SecurityPanel() {
  return (
    <Card className="border-hairline bg-card">
      <CardContent className="space-y-4 p-5">
        <SettingRow title="登入方式" description="Google 登入尚未接入，將在 auth workstream 處理。" value="待設定" />
        <SettingRow title="資料隔離" description="正式 beta 需完成 organization / membership route guard。" value="待實作" />
        <div className="rounded-md border border-hairline bg-paper p-4">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-muted-foreground" />
            <p className="text-sm font-medium text-ink">安全提醒</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            目前頁面只揭示狀態，不新增權限設定或登入流程。
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function DataPanel() {
  return (
    <Card className="border-hairline bg-card">
      <CardContent className="divide-y divide-hairline p-0">
        <DangerRow
          title="清空訪談與規劃資料"
          description="刪除訪前規劃、SPIN 對話紀錄與分析報告；客戶資料會保留。"
          actionLabel="立即清空"
          onConfirm={async () => {
            if (confirm("確定要清空所有訪談規劃資料嗎？此操作無法還原。")) {
              const visit = await import("@/domains/visit/store");
              const spin = await import("@/domains/spin/store");
              const report = await import("@/domains/report/store");
              visit.useVisitStore.getState().clearAll();
              spin.useSpinStore.getState().clearAll();
              report.useReportStore.getState().clearAll();
              alert("資料已成功清空。");
              window.location.reload();
            }
          }}
        />
        <DangerRow
          title="重置應用程式"
          description="清除所有本地快取，包含客戶資料與設定，恢復至初始 demo 狀態。"
          actionLabel="完全重置"
          variant="outline"
          onConfirm={() => {
            if (confirm("確定要重置整個應用程式嗎？這將刪除所有本地存儲的資料（含客戶清單）。")) {
              localStorage.clear();
              alert("應用程式已重置。");
              window.location.reload();
            }
          }}
        />
      </CardContent>
    </Card>
  );
}

function SwitchButton({
  checked,
  onClick,
  label,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full border border-hairline transition-colors",
        checked ? "bg-ink" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "absolute top-1 size-5 rounded-full bg-paper transition-transform",
          checked ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  );
}

function ChoiceButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-24 flex-col items-start justify-between rounded-md border p-4 text-left transition-colors",
        active ? "border-ink bg-ink text-paper" : "border-hairline bg-paper text-ink hover:bg-muted"
      )}
      aria-pressed={active}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <Icon className="size-4" />
        {active ? <Check className="size-4" /> : null}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function SettingRow({
  title,
  description,
  value,
}: {
  title: string;
  description: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-hairline bg-paper p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </div>
      <Badge variant="outline" className="w-fit rounded-full border-hairline">
        {value}
      </Badge>
    </div>
  );
}

function DangerRow({
  title,
  description,
  actionLabel,
  variant = "destructive",
  onConfirm,
}: {
  title: string;
  description: string;
  actionLabel: string;
  variant?: "destructive" | "outline";
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-xl">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <Button variant={variant} className="h-10 w-fit" onClick={onConfirm}>
        {actionLabel}
      </Button>
    </div>
  );
}
