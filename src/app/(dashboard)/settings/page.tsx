"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bot,
  Check,
  ChevronRight,
  Link2,
  Loader2,
  MonitorCog,
  Shield,
  User,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SectionId =
  | "profile"
  | "notifications"
  | "ai"
  | "integrations"
  | "workspace"
  | "collaborators"
  | "security";

type WorkspacePath = "/dashboard" | "/crm" | "/pre-visit" | "/reports";
type AiTone = "balanced" | "concise" | "coaching";

type MemberSettings = {
  profile: {
    displayName: string;
    title: string;
    region: string;
    locale: "zh-TW";
  };
  notifications: {
    reportOpened: boolean;
    spinReminder: boolean;
    teamUpdates: boolean;
    aiDailyInsight: boolean;
  };
  aiPreferences: {
    tone: AiTone;
    dailyInsightLimit: number;
    autoDraftVisitPlan: boolean;
  };
  personalIntegrations: {
    calendarSync: boolean;
    emailDigest: boolean;
  };
  defaultWorkspace: {
    organizationId: string;
    landingPath: WorkspacePath;
  };
};

type MemberSettingsResponse = {
  settings: MemberSettings;
  user: {
    id: string;
    email: string;
    name: string;
  };
  membership: {
    id: string;
    role: string;
    title: string;
    region: string;
  };
  organization: {
    id: string;
    name: string;
    plan: string;
  };
  policy: {
    maxCollaborators: number;
    collaboratorEntryVisible: boolean;
    aiDailyInsightLimitMax: number;
    monthlyAiQuota: number;
  };
};

const SECTIONS: Array<{ id: SectionId; label: string; icon: LucideIcon }> = [
  { id: "profile", label: "個人資料", icon: User },
  { id: "notifications", label: "通知", icon: Bell },
  { id: "ai", label: "AI 偏好", icon: Bot },
  { id: "integrations", label: "個人整合", icon: Link2 },
  { id: "workspace", label: "預設工作區", icon: MonitorCog },
  { id: "collaborators", label: "協作者", icon: UserPlus },
  { id: "security", label: "安全狀態", icon: Shield },
];

const NOTIFICATION_ROWS: Array<{
  id: keyof MemberSettings["notifications"];
  label: string;
  description: string;
}> = [
  { id: "reportOpened", label: "報告被開啟時通知", description: "客戶瀏覽分享報告時推送提醒。" },
  { id: "spinReminder", label: "SPIN 對話提醒", description: "超過 7 天未聯繫客戶時提醒。" },
  { id: "teamUpdates", label: "團隊動態更新", description: "管理角色可接收輔導與團隊摘要。" },
  { id: "aiDailyInsight", label: "AI 每日洞察", description: "依你的配額上限推送個人化建議。" },
];

const TONE_OPTIONS: Array<{ value: AiTone; label: string; description: string }> = [
  { value: "balanced", label: "平衡", description: "保留完整脈絡與下一步。" },
  { value: "concise", label: "精簡", description: "優先輸出短句與重點。" },
  { value: "coaching", label: "教練", description: "多給話術與追問提醒。" },
];

const WORKSPACE_OPTIONS: Array<{ value: WorkspacePath; label: string; description: string }> = [
  { value: "/dashboard", label: "今日主線", description: "登入後先看下一步。" },
  { value: "/crm", label: "客戶管理", description: "直接進入客戶列表。" },
  { value: "/pre-visit", label: "訪前規劃", description: "優先準備拜訪包。" },
  { value: "/reports", label: "分析報告", description: "快速回到報告庫。" },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SectionId>("profile");
  const [data, setData] = useState<MemberSettingsResponse | null>(null);
  const [draft, setDraft] = useState<MemberSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/member/settings", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("MEMBER_SETTINGS_LOAD_FAILED");
        }

        const payload = (await response.json()) as MemberSettingsResponse;

        if (active) {
          setData(payload);
          setDraft(payload.settings);
          setErrorMessage(null);
        }
      } catch {
        if (active) {
          setErrorMessage("無法載入個人設定，請確認目前 session 或 demo header。");
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, []);

  const activeLabel = useMemo(
    () => SECTIONS.find((section) => section.id === activeSection)?.label ?? "個人設定",
    [activeSection],
  );

  const saveSettings = async () => {
    if (!draft) {
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/member/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        throw new Error("MEMBER_SETTINGS_SAVE_FAILED");
      }

      const payload = (await response.json()) as MemberSettingsResponse;
      setData(payload);
      setDraft(payload.settings);
      setStatusMessage("個人設定已儲存。");
    } catch {
      setErrorMessage("儲存失敗，請稍後再試。");
    } finally {
      setIsSaving(false);
    }
  };

  const updateDraft = (next: (current: MemberSettings) => MemberSettings) => {
    setDraft((current) => (current ? next(current) : current));
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-hairline pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-2">
          <Badge variant="outline" className="w-fit rounded-full border-hairline text-[11px]">
            Member preferences
          </Badge>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">個人設定</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              只管理目前使用者的個人資料、通知、AI 預設與工作區偏好；組織品牌、帳務、單位與合規政策會在 org settings 管理。
            </p>
          </div>
        </div>
        <Button variant="mono" className="h-10 w-fit" onClick={saveSettings} disabled={!draft || isSaving}>
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          儲存個人設定
        </Button>
      </header>

      {statusMessage ? (
        <div className="rounded-md border border-hairline bg-paper px-4 py-3 text-sm text-ink">{statusMessage}</div>
      ) : null}
      {errorMessage ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Card className="border-hairline bg-card">
          <CardContent className="p-2">
            <nav className="grid gap-1" aria-label="個人設定分類">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex min-h-10 items-center gap-3 rounded-md px-3 text-left text-sm transition-colors",
                    activeSection === section.id
                      ? "bg-ink text-paper"
                      : "text-muted-foreground hover:bg-muted hover:text-ink",
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
              <p className="text-sm text-muted-foreground">
                {data ? `${data.organization.name} · ${data.membership.role}` : "讀取目前 member session"}
              </p>
            </div>
          </div>

          {isLoading ? <LoadingPanel /> : null}
          {!isLoading && draft && data && activeSection === "profile" ? (
            <ProfilePanel data={data} draft={draft} updateDraft={updateDraft} />
          ) : null}
          {!isLoading && draft && activeSection === "notifications" ? (
            <NotificationsPanel draft={draft} updateDraft={updateDraft} />
          ) : null}
          {!isLoading && draft && data && activeSection === "ai" ? (
            <AiPanel data={data} draft={draft} updateDraft={updateDraft} />
          ) : null}
          {!isLoading && draft && activeSection === "integrations" ? (
            <IntegrationsPanel draft={draft} updateDraft={updateDraft} />
          ) : null}
          {!isLoading && draft && data && activeSection === "workspace" ? (
            <WorkspacePanel data={data} draft={draft} updateDraft={updateDraft} />
          ) : null}
          {!isLoading && data && activeSection === "collaborators" ? <CollaboratorsPanel data={data} /> : null}
          {!isLoading && data && activeSection === "security" ? <SecurityPanel data={data} /> : null}
        </section>
      </div>
    </div>
  );
}

function LoadingPanel() {
  return (
    <Card className="border-hairline bg-card">
      <CardContent className="flex min-h-40 items-center gap-3 p-5 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        正在載入個人設定
      </CardContent>
    </Card>
  );
}

function ProfilePanel({
  data,
  draft,
  updateDraft,
}: {
  data: MemberSettingsResponse;
  draft: MemberSettings;
  updateDraft: (next: (current: MemberSettings) => MemberSettings) => void;
}) {
  const initials = draft.profile.displayName.slice(0, 1) || data.user.email.slice(0, 1).toUpperCase();

  return (
    <Card className="border-hairline bg-card">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex size-14 items-center justify-center rounded-full border border-hairline bg-paper text-lg font-semibold text-ink">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-ink">{draft.profile.displayName}</p>
            <p className="text-sm text-muted-foreground">{data.user.email}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="顯示名稱"
            value={draft.profile.displayName}
            onChange={(value) =>
              updateDraft((current) => ({
                ...current,
                profile: { ...current.profile, displayName: value },
              }))
            }
          />
          <Field
            label="職稱"
            value={draft.profile.title}
            onChange={(value) =>
              updateDraft((current) => ({ ...current, profile: { ...current.profile, title: value } }))
            }
          />
          <Field
            label="區域"
            value={draft.profile.region}
            onChange={(value) =>
              updateDraft((current) => ({ ...current, profile: { ...current.profile, region: value } }))
            }
          />
          <ReadOnlyTile label="介面語言" value="繁體中文 zh-TW" />
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationsPanel({
  draft,
  updateDraft,
}: {
  draft: MemberSettings;
  updateDraft: (next: (current: MemberSettings) => MemberSettings) => void;
}) {
  return (
    <Card className="border-hairline bg-card">
      <CardContent className="divide-y divide-hairline p-0">
        {NOTIFICATION_ROWS.map((setting) => (
          <div key={setting.id} className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm font-medium text-ink">{setting.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{setting.description}</p>
            </div>
            <SwitchButton
              checked={draft.notifications[setting.id]}
              label={setting.label}
              onClick={() =>
                updateDraft((current) => ({
                  ...current,
                  notifications: {
                    ...current.notifications,
                    [setting.id]: !current.notifications[setting.id],
                  },
                }))
              }
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AiPanel({
  data,
  draft,
  updateDraft,
}: {
  data: MemberSettingsResponse;
  draft: MemberSettings;
  updateDraft: (next: (current: MemberSettings) => MemberSettings) => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="border-hairline bg-card">
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-sm font-medium text-ink">回答語氣</p>
            <p className="mt-1 text-xs text-muted-foreground">只影響你的 AI 預設提示；組織配額與政策仍由 org admin 控制。</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {TONE_OPTIONS.map((option) => (
              <ChoiceButton
                key={option.value}
                active={draft.aiPreferences.tone === option.value}
                label={option.label}
                description={option.description}
                onClick={() =>
                  updateDraft((current) => ({
                    ...current,
                    aiPreferences: { ...current.aiPreferences, tone: option.value },
                  }))
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-hairline bg-card">
        <CardContent className="space-y-5 p-5">
          <SettingRow
            title="每日 AI 洞察上限"
            description={`你的目前上限為 ${data.policy.aiDailyInsightLimitMax} 則，由方案月配額 ${data.policy.monthlyAiQuota} 推導。`}
            value={`${draft.aiPreferences.dailyInsightLimit} 則`}
          />
          <input
            type="range"
            min={0}
            max={data.policy.aiDailyInsightLimitMax}
            value={draft.aiPreferences.dailyInsightLimit}
            onChange={(event) =>
              updateDraft((current) => ({
                ...current,
                aiPreferences: {
                  ...current.aiPreferences,
                  dailyInsightLimit: Number(event.currentTarget.value),
                },
              }))
            }
            className="w-full accent-ink"
            aria-label="每日 AI 洞察上限"
          />
          <ToggleRow
            title="自動草擬訪前準備包"
            description="AI 了解客戶完成後，預設產生 VisitPlan 草稿。"
            checked={draft.aiPreferences.autoDraftVisitPlan}
            onClick={() =>
              updateDraft((current) => ({
                ...current,
                aiPreferences: {
                  ...current.aiPreferences,
                  autoDraftVisitPlan: !current.aiPreferences.autoDraftVisitPlan,
                },
              }))
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

function IntegrationsPanel({
  draft,
  updateDraft,
}: {
  draft: MemberSettings;
  updateDraft: (next: (current: MemberSettings) => MemberSettings) => void;
}) {
  return (
    <Card className="border-hairline bg-card">
      <CardContent className="divide-y divide-hairline p-0">
        <ToggleRow
          title="個人行事曆同步"
          description="僅作為你的個人提醒，不會開放 org admin 讀取私人行程。"
          checked={draft.personalIntegrations.calendarSync}
          onClick={() =>
            updateDraft((current) => ({
              ...current,
              personalIntegrations: {
                ...current.personalIntegrations,
                calendarSync: !current.personalIntegrations.calendarSync,
              },
            }))
          }
        />
        <ToggleRow
          title="Email 摘要"
          description="每週寄送個人待辦與 AI 使用摘要；正式寄信仍待 notification workstream 接入。"
          checked={draft.personalIntegrations.emailDigest}
          onClick={() =>
            updateDraft((current) => ({
              ...current,
              personalIntegrations: {
                ...current.personalIntegrations,
                emailDigest: !current.personalIntegrations.emailDigest,
              },
            }))
          }
        />
      </CardContent>
    </Card>
  );
}

function WorkspacePanel({
  data,
  draft,
  updateDraft,
}: {
  data: MemberSettingsResponse;
  draft: MemberSettings;
  updateDraft: (next: (current: MemberSettings) => MemberSettings) => void;
}) {
  return (
    <Card className="border-hairline bg-card">
      <CardContent className="space-y-5 p-5">
        <ReadOnlyTile label="目前 workspace" value={data.organization.name} />
        <div className="grid gap-3 sm:grid-cols-2">
          {WORKSPACE_OPTIONS.map((option) => (
            <ChoiceButton
              key={option.value}
              active={draft.defaultWorkspace.landingPath === option.value}
              label={option.label}
              description={option.description}
              onClick={() =>
                updateDraft((current) => ({
                  ...current,
                  defaultWorkspace: {
                    organizationId: data.organization.id,
                    landingPath: option.value,
                  },
                }))
              }
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function CollaboratorsPanel({ data }: { data: MemberSettingsResponse }) {
  return (
    <Card className="border-hairline bg-card">
      <CardContent className="space-y-4 p-5">
        <SettingRow
          title="個人協作者入口"
          description="個人版 owner 可邀請協作者，但 invite 與上限檢查必須走 server-side plan policy。"
          value={data.policy.collaboratorEntryVisible ? "可使用" : "此角色或方案不可用"}
        />
        <div className="rounded-md border border-hairline bg-paper p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink">方案允許協作者</p>
              <p className="mt-1 text-xs text-muted-foreground">
                上限由 super admin 的 PlanConfig 控制，目前為 {data.policy.maxCollaborators} 位。
              </p>
            </div>
            <Button variant="monoOutline" size="sm" disabled={!data.policy.collaboratorEntryVisible}>
              前往邀請流程
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SecurityPanel({ data }: { data: MemberSettingsResponse }) {
  return (
    <Card className="border-hairline bg-card">
      <CardContent className="space-y-4 p-5">
        <SettingRow title="設定儲存位置" description="儲存在目前 membership 的 member-scoped settings JSON。" value="DB-backed" />
        <SettingRow title="資料邊界" description="本頁不修改組織品牌、帳務、單位政策、client portal、AI quota 或合規預設。" value="Member only" />
        <SettingRow title="目前角色" description={`${data.organization.name} 的目前 session role。`} value={data.membership.role} />
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input value={value} onChange={(event) => onChange(event.currentTarget.value)} />
    </label>
  );
}

function ReadOnlyTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-hairline bg-paper px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

function SettingRow({ title, description, value }: { title: string; description: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-hairline bg-paper p-4">
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <Badge variant="outline" className="shrink-0 border-hairline text-[11px]">
        {value}
      </Badge>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onClick,
}: {
  title: string;
  description: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-5">
      <div>
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <SwitchButton checked={checked} label={title} onClick={onClick} />
    </div>
  );
}

function SwitchButton({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={checked}
      className={cn(
        "relative h-6 w-11 shrink-0 rounded-full border border-hairline transition-colors",
        checked ? "bg-ink" : "bg-muted",
      )}
    >
      <span
        className={cn(
          "absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-paper transition-transform",
          checked ? "translate-x-5" : "translate-x-1",
        )}
      />
    </button>
  );
}

function ChoiceButton({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md border p-4 text-left transition-colors",
        active ? "border-ink bg-ink text-paper" : "border-hairline bg-paper text-ink hover:border-hairline-2",
      )}
      aria-pressed={active}
    >
      <p className="text-sm font-semibold">{label}</p>
      <p className={cn("mt-1 text-xs leading-5", active ? "text-paper/75" : "text-muted-foreground")}>
        {description}
      </p>
    </button>
  );
}
