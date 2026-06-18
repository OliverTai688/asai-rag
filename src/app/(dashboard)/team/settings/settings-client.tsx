"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Building2,
  Check,
  CreditCard,
  Loader2,
  MonitorSmartphone,
  Palette,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type BillingVisibility = "OWNER_ONLY" | "OWNER_ADMIN" | "MANAGER_SUMMARY";
type DefaultComplianceReview = "NONE" | "BASIC" | "STRICT";

type OrgSettings = {
  profile: {
    displayName: string;
    logoUrl: string;
    brandColor: string;
  };
  clientPortal: {
    enabled: boolean;
    shareBrandingEnabled: boolean;
    defaultCtaLabel: string;
    defaultCtaUrl: string;
  };
  complianceDefaults: {
    requireKycBeforeReport: boolean;
    requireSuitabilityCheck: boolean;
    defaultReviewLevel: DefaultComplianceReview;
  };
  billingVisibility: {
    level: BillingVisibility;
  };
  aiQuota: {
    monthlyQuota: number;
    warningThresholdPercent: number;
  };
};

type OrgSettingsResponse = {
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: string;
    monthlyAiQuota: number;
    monthlyAiUsed: number;
    paymentProvider: string | null;
    status: string;
  };
  settings: OrgSettings;
  planPolicy: {
    maxMembers: number;
    maxCollaborators: number;
    maxUnits: number;
    monthlyAiQuota: number;
    shareBrandingEnabled: boolean;
    clientPortalEnabled: boolean;
  };
  scope: {
    role: string;
    unitIds: string[];
    scopedToManagedUnits: boolean;
  };
  permissions: {
    canRead: boolean;
    canWrite: boolean;
    canManageBillingVisibility: boolean;
    canEnableShareBranding: boolean;
    canEnableClientPortal: boolean;
  };
};

const billingLabels: Record<BillingVisibility, string> = {
  OWNER_ONLY: "僅 owner",
  OWNER_ADMIN: "owner / admin",
  MANAGER_SUMMARY: "manager 只看彙總",
};

const reviewLabels: Record<DefaultComplianceReview, string> = {
  NONE: "不自動要求",
  BASIC: "基本檢查",
  STRICT: "嚴格檢查",
};

export function OrgSettingsClient() {
  const [data, setData] = useState<OrgSettingsResponse | null>(null);
  const [draft, setDraft] = useState<OrgSettings | null>(null);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSettings() {
      try {
        const response = await fetch("/api/org/settings", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("ORG_SETTINGS_LOAD_FAILED");
        }

        const payload = (await response.json()) as OrgSettingsResponse;

        if (active) {
          setData(payload);
          setDraft(payload.settings);
          setErrorMessage(null);
        }
      } catch {
        if (active) {
          setErrorMessage("無法載入通訊處設定，請確認目前 session 或管理權限。");
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

  const quotaPercent = useMemo(() => {
    if (!data?.organization.monthlyAiQuota) return 0;
    return Math.min(100, Math.round((data.organization.monthlyAiUsed / data.organization.monthlyAiQuota) * 100));
  }, [data]);

  const updateDraft = (next: (current: OrgSettings) => OrgSettings) => {
    setDraft((current) => (current ? next(current) : current));
  };

  const saveSettings = async () => {
    if (!draft || !data?.permissions.canWrite) {
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/org/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, reason }),
      });

      if (!response.ok) {
        throw new Error("ORG_SETTINGS_SAVE_FAILED");
      }

      const payload = (await response.json()) as OrgSettingsResponse;
      setData(payload);
      setDraft(payload.settings);
      setReason("");
      setStatusMessage("通訊處設定已儲存，並已寫入操作紀錄。");
    } catch {
      setErrorMessage("儲存失敗，請確認 reason 已填寫，或目前帳號具備 owner/admin 權限。");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-4 border-b border-hairline pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="w-fit rounded-full border-hairline text-[11px]">
              Org settings
            </Badge>
            <Badge variant="secondary" className="w-fit rounded-full text-[11px]">
              No client details
            </Badge>
            {data ? (
              <Badge variant="outline" className="w-fit rounded-full border-hairline text-[11px]">
                {data.scope.role}
              </Badge>
            ) : null}
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-ink">通訊處設定</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              管理組織品牌、客戶入口、合規預設、帳務可見度與 AI 用量提醒；不讀取 member 個人偏好或客戶明細。
            </p>
          </div>
        </div>
        <Button
          variant="mono"
          className="h-10 w-fit"
          onClick={saveSettings}
          disabled={!draft || !data?.permissions.canWrite || !reason.trim() || isSaving}
        >
          {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          儲存 org 設定
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
      {data && !data.permissions.canWrite ? (
        <div className="rounded-md border border-hairline bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          目前角色可檢視通訊處政策，但不能修改設定。
        </div>
      ) : null}

      {isLoading ? (
        <Card className="border-hairline bg-card">
          <CardContent className="flex min-h-40 items-center gap-3 p-5 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            正在載入通訊處設定
          </CardContent>
        </Card>
      ) : null}

      {!isLoading && data && draft ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="space-y-5">
            <SettingsPanel icon={Building2} title="組織 Profile" description="顯示在管理台與分享頁的公開識別。">
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="顯示名稱"
                  value={draft.profile.displayName}
                  disabled={!data.permissions.canWrite}
                  onChange={(value) =>
                    updateDraft((current) => ({
                      ...current,
                      profile: { ...current.profile, displayName: value },
                    }))
                  }
                />
                <Field
                  label="Logo URL"
                  value={draft.profile.logoUrl}
                  disabled={!data.permissions.canWrite}
                  onChange={(value) =>
                    updateDraft((current) => ({
                      ...current,
                      profile: { ...current.profile, logoUrl: value },
                    }))
                  }
                />
                <Field
                  label="品牌色"
                  value={draft.profile.brandColor}
                  disabled={!data.permissions.canWrite}
                  placeholder="#1A3A6B"
                  onChange={(value) =>
                    updateDraft((current) => ({
                      ...current,
                      profile: { ...current.profile, brandColor: value },
                    }))
                  }
                />
                <ReadOnlyTile label="Org slug" value={data.organization.slug} />
              </div>
            </SettingsPanel>

            <SettingsPanel icon={MonitorSmartphone} title="Client Portal" description="控制客戶分享頁與客戶登入入口的預設行為。">
              <div className="grid gap-4 md:grid-cols-2">
                <ToggleRow
                  label="啟用客戶入口"
                  description={
                    data.planPolicy.clientPortalEnabled ? "方案允許時才會真正開啟。" : "目前方案未開放 client portal。"
                  }
                  checked={draft.clientPortal.enabled}
                  disabled={!data.permissions.canEnableClientPortal}
                  onChange={(checked) =>
                    updateDraft((current) => ({
                      ...current,
                      clientPortal: { ...current.clientPortal, enabled: checked },
                    }))
                  }
                />
                <ToggleRow
                  label="分享頁顯示品牌"
                  description={
                    data.planPolicy.shareBrandingEnabled ? "可在 share page 使用通訊處品牌。" : "目前方案未開放分享頁品牌。"
                  }
                  checked={draft.clientPortal.shareBrandingEnabled}
                  disabled={!data.permissions.canEnableShareBranding}
                  onChange={(checked) =>
                    updateDraft((current) => ({
                      ...current,
                      clientPortal: { ...current.clientPortal, shareBrandingEnabled: checked },
                    }))
                  }
                />
                <Field
                  label="預設 CTA"
                  value={draft.clientPortal.defaultCtaLabel}
                  disabled={!data.permissions.canWrite}
                  onChange={(value) =>
                    updateDraft((current) => ({
                      ...current,
                      clientPortal: { ...current.clientPortal, defaultCtaLabel: value },
                    }))
                  }
                />
                <Field
                  label="預設 CTA URL"
                  value={draft.clientPortal.defaultCtaUrl}
                  disabled={!data.permissions.canWrite}
                  onChange={(value) =>
                    updateDraft((current) => ({
                      ...current,
                      clientPortal: { ...current.clientPortal, defaultCtaUrl: value },
                    }))
                  }
                />
              </div>
            </SettingsPanel>

            <SettingsPanel icon={ShieldCheck} title="合規預設" description="新報告與客戶入口的最低合規檢查。">
              <div className="grid gap-4 md:grid-cols-2">
                <ToggleRow
                  label="報告前要求 KYC"
                  description="提醒顧問先補齊 KYC 與適合度資訊。"
                  checked={draft.complianceDefaults.requireKycBeforeReport}
                  disabled={!data.permissions.canWrite}
                  onChange={(checked) =>
                    updateDraft((current) => ({
                      ...current,
                      complianceDefaults: { ...current.complianceDefaults, requireKycBeforeReport: checked },
                    }))
                  }
                />
                <ToggleRow
                  label="要求適合度檢查"
                  description="將 suitability checklist 作為報告前置提醒。"
                  checked={draft.complianceDefaults.requireSuitabilityCheck}
                  disabled={!data.permissions.canWrite}
                  onChange={(checked) =>
                    updateDraft((current) => ({
                      ...current,
                      complianceDefaults: { ...current.complianceDefaults, requireSuitabilityCheck: checked },
                    }))
                  }
                />
                <div className="space-y-2">
                  <Label>預設審閱等級</Label>
                  <Select
                    value={draft.complianceDefaults.defaultReviewLevel}
                    disabled={!data.permissions.canWrite}
                    onValueChange={(value) =>
                      updateDraft((current) => ({
                        ...current,
                        complianceDefaults: {
                          ...current.complianceDefaults,
                          defaultReviewLevel: value as DefaultComplianceReview,
                        },
                      }))
                    }
                  >
                    <SelectTrigger className="border-hairline">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(reviewLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SettingsPanel>

            <SettingsPanel icon={SlidersHorizontal} title="AI 用量提醒" description="配額由 plan 控制，org admin 只設定提醒門檻。">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">本月用量</span>
                    <span className="font-mono tabular-nums text-ink">
                      {data.organization.monthlyAiUsed} / {data.organization.monthlyAiQuota}
                    </span>
                  </div>
                  <Progress value={quotaPercent} />
                  <p className="text-xs text-muted-foreground">達到門檻後顯示內部提醒，不自動停用 AI。</p>
                </div>
                <Field
                  label="提醒門檻 %"
                  value={String(draft.aiQuota.warningThresholdPercent)}
                  disabled={!data.permissions.canWrite}
                  onChange={(value) =>
                    updateDraft((current) => ({
                      ...current,
                      aiQuota: {
                        ...current.aiQuota,
                        warningThresholdPercent: Number.parseInt(value, 10) || 80,
                      },
                    }))
                  }
                />
              </div>
            </SettingsPanel>
          </main>

          <aside className="space-y-5">
            <SettingsPanel icon={CreditCard} title="帳務可見度" description="不顯示 provider customer id 或 subscription id。">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>可見範圍</Label>
                  <Select
                    value={draft.billingVisibility.level}
                    disabled={!data.permissions.canManageBillingVisibility}
                    onValueChange={(value) =>
                      updateDraft((current) => ({
                        ...current,
                        billingVisibility: { level: value as BillingVisibility },
                      }))
                    }
                  >
                    <SelectTrigger className="border-hairline">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(billingLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <ReadOnlyTile label="Payment provider" value={data.organization.paymentProvider ?? "未設定"} />
                <ReadOnlyTile label="Plan" value={data.organization.plan} />
              </div>
            </SettingsPanel>

            <SettingsPanel icon={Palette} title="方案政策" description="由 super admin / PlanConfig 控制。">
              <div className="grid gap-2">
                <PolicyRow label="成員上限" value={data.planPolicy.maxMembers} />
                <PolicyRow label="協作者上限" value={data.planPolicy.maxCollaborators} />
                <PolicyRow label="單位上限" value={data.planPolicy.maxUnits} />
                <PolicyRow label="月 AI 額度" value={data.planPolicy.monthlyAiQuota} />
              </div>
            </SettingsPanel>

            {data.permissions.canWrite ? (
              <SettingsPanel icon={ShieldCheck} title="儲存 reason" description="任何 org-wide 設定變更都會寫 AuditLog。">
                <Textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="例：更新分享頁品牌與合規預設，供下週試營運使用"
                  className="min-h-28 border-hairline"
                />
              </SettingsPanel>
            ) : null}
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function SettingsPanel({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="border-hairline bg-card">
      <CardContent className="space-y-5 p-5">
        <div className="flex gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-hairline bg-paper">
            <Icon className="size-4 text-ink" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="border-hairline"
      />
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-24 cursor-pointer gap-3 rounded-lg border border-hairline bg-paper p-4">
      <Checkbox
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onChange(value === true)}
        className="mt-0.5"
      />
      <span className="space-y-1">
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </label>
  );
}

function ReadOnlyTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-paper p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium text-ink">{value}</p>
    </div>
  );
}

function PolicyRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-hairline bg-paper px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums text-ink">{value}</span>
    </div>
  );
}
