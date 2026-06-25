"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { AddRelationshipDialog } from "@/components/crm/AddRelationshipDialog";
import { RelationshipMap } from "@/components/crm/RelationshipMap";
import { RelationshipGraphSourceReview } from "@/components/crm/RelationshipGraphSourceReview";
import { useClientRecord } from "@/components/crm/use-client-record";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  FamilyMemberProfile,
  FamilyMemberProfileFactStatus,
  FamilyMemberProfileField,
} from "@/domains/client/family-member-profile";
import { FAMILY_MEMBER_PROFILE_SCHEMA_VERSION } from "@/domains/client/family-member-profile";
import {
  buildClientRelationshipGraphReview,
  type ClientRelationshipGraphReview,
} from "@/domains/client/relationship-graph";
import { clientService } from "@/domains/client/service";
import type { FamilyMember } from "@/domains/client/types";
import { Info, PencilLine, Save, ShieldCheck, Trash2, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import {
  CompactMetric,
  EmptyRelatedState,
  IconAction,
  RecordSubpageHeader,
} from "../_components/record-subpage-ui";

type ProfileFieldKey =
  | "jobTitle"
  | "annualIncomeOrDependency"
  | "personStatus"
  | "decisionRole"
  | "relationshipContext";

type ProfileFieldDraft = {
  value: string;
  factStatus: FamilyMemberProfileFactStatus;
  rationale: string;
};

type ProfileDraft = Record<ProfileFieldKey, ProfileFieldDraft>;

type RelationshipGraphBffStatus = "idle" | "ready" | "error";

interface RelationshipGraphBffResponse {
  graph: ClientRelationshipGraphReview;
}

const PROFILE_FIELD_CONFIG: Array<{ key: ProfileFieldKey; label: string; placeholder: string }> = [
  { key: "jobTitle", label: "職位 / 職業", placeholder: "例如：科技業主管、退休教師" },
  { key: "annualIncomeOrDependency", label: "年收入 / 財務依賴", placeholder: "例如：約 180 萬、依賴主客戶支援" },
  { key: "personStatus", label: "人物狀態", placeholder: "例如：準備退休、剛換工作、育兒壓力中" },
  { key: "decisionRole", label: "決策角色", placeholder: "例如：共同決策者、主要影響者、被照顧者" },
  { key: "relationshipContext", label: "關係脈絡", placeholder: "例如：對保費敏感、常影響家庭決策" },
];

const PROFILE_STATUS_OPTIONS: Array<{ value: FamilyMemberProfileFactStatus; label: string }> = [
  { value: "FACT", label: "已確認" },
  { value: "INFERENCE", label: "推論" },
  { value: "UNKNOWN", label: "待確認" },
];

export default function ClientRelationshipsPage() {
  const params = useParams();
  const clientId = params.clientId as string;
  const { client } = useClientRecord(clientId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"child" | "parent">("child");
  const [targetNodeId, setTargetNodeId] = useState<string | null>(null);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [editingProfileMemberId, setEditingProfileMemberId] = useState<string | null>(null);
  const [savingProfileMemberId, setSavingProfileMemberId] = useState<string | null>(null);
  const [profileDraftByMemberId, setProfileDraftByMemberId] = useState<Record<string, ProfileDraft>>({});
  const [bffGraphReview, setBffGraphReview] = useState<ClientRelationshipGraphReview | null>(null);
  const [bffGraphStatus, setBffGraphStatus] = useState<RelationshipGraphBffStatus>("idle");
  const localGraphReview = useMemo(
    () => (client ? buildClientRelationshipGraphReview(client) : null),
    [client],
  );
  const familyGraphSignature = useMemo(() => buildFamilyGraphSignature(client?.family ?? []), [client?.family]);
  const graphReview = bffGraphReview ?? localGraphReview;
  const graphSource = bffGraphReview ? "bff" : "client-fallback";

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/clients/${clientId}/relationship-graph`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`RELATIONSHIP_GRAPH_BFF_${response.status}`);
        }

        return response.json() as Promise<RelationshipGraphBffResponse>;
      })
      .then((payload) => {
        if (cancelled) return;
        setBffGraphReview(payload.graph);
        setBffGraphStatus("ready");
      })
      .catch((error) => {
        if (cancelled) return;
        console.error(error);
        setBffGraphReview(null);
        setBffGraphStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, familyGraphSignature]);

  function openDialogForRoot() {
    setTargetNodeId(null);
    setDialogMode("child");
    setDialogOpen(true);
  }

  function openDialogForNodeAsChild(memberId: string | null) {
    setTargetNodeId(memberId);
    setDialogMode("child");
    setDialogOpen(true);
  }

  function openDialogForNodeAsParent(memberId: string | null) {
    setTargetNodeId(memberId);
    setDialogMode("parent");
    setDialogOpen(true);
  }

  async function handleDeleteMember(memberId: string, memberName: string) {
    if (!confirm("確定要刪除此關係人嗎？")) return;

    try {
      setDeletingMemberId(memberId);
      await clientService.deleteFamilyMemberRemote(clientId, memberId);
      toast.success(`${memberName} 已刪除`);
    } catch (error) {
      console.error(error);
      toast.error("刪除失敗，請稍後再試");
    } finally {
      setDeletingMemberId(null);
    }
  }

  function openProfileEditor(member: FamilyMember) {
    setProfileDraftByMemberId((current) => ({
      ...current,
      [member.id]: current[member.id] ?? createProfileDraft(member),
    }));
    setEditingProfileMemberId(member.id);
  }

  function closeProfileEditor() {
    setEditingProfileMemberId(null);
  }

  function updateProfileDraft(
    memberId: string,
    fieldKey: ProfileFieldKey,
    patch: Partial<ProfileFieldDraft>,
  ) {
    setProfileDraftByMemberId((current) => {
      const currentDraft = current[memberId];
      if (!currentDraft) return current;

      return {
        ...current,
        [memberId]: {
          ...currentDraft,
          [fieldKey]: {
            ...currentDraft[fieldKey],
            ...patch,
          },
        },
      };
    });
  }

  async function handleSaveProfile(member: FamilyMember) {
    const draft = profileDraftByMemberId[member.id] ?? createProfileDraft(member);
    const profilePayload = buildProfilePayload(member, draft);

    try {
      setSavingProfileMemberId(member.id);
      await clientService.updateFamilyMemberRemote(clientId, member.id, {
        profile: profilePayload,
      });
      toast.success(`${member.name} 的人物資料已更新`);
      setEditingProfileMemberId(null);
    } catch (error) {
      console.error(error);
      toast.error("人物資料儲存失敗，請檢查欄位內容");
    } finally {
      setSavingProfileMemberId(null);
    }
  }

  async function handleClearProfile(member: FamilyMember) {
    if (!confirm(`確定清空 ${member.name} 的人物資料嗎？`)) return;

    try {
      setSavingProfileMemberId(member.id);
      await clientService.updateFamilyMemberRemote(clientId, member.id, {
        profile: null,
      });
      setProfileDraftByMemberId((current) => ({
        ...current,
        [member.id]: createEmptyProfileDraft(),
      }));
      toast.success(`${member.name} 的人物資料已清空`);
      setEditingProfileMemberId(null);
    } catch (error) {
      console.error(error);
      toast.error("清空人物資料失敗，請稍後再試");
    } finally {
      setSavingProfileMemberId(null);
    }
  }

  if (!client || !graphReview) return null;

  const directConnections = client.family.filter((member) => !member.parentMemberId).length;
  const withPhone = client.family.filter((member) => member.phone).length;
  const profiledMembers = client.family.filter((member) => countProfileFields(member.profile) > 0).length;

  return (
    <div className="space-y-5">
      <RecordSubpageHeader
        eyebrow="Relationship graph"
        title="關係人管理"
        description="先看家庭與社會關係的覆蓋狀況，再補上真正會影響保障責任的關係人。"
        action={
          <Button
            variant="mono"
            className="w-full rounded-full sm:w-auto"
            onClick={openDialogForRoot}
          >
            <UserPlus className="h-4 w-4" strokeWidth={1.5} />
            新增關係人
          </Button>
        }
      />

      <AddRelationshipDialog
        clientId={clientId}
        clientName={client.name}
        existingMembers={client.family}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultParentMemberId={targetNodeId}
        mode={dialogMode}
      />

      <div className="grid gap-3 md:grid-cols-3">
        <CompactMetric label="關係人" value={`${client.family.length} 位`} helper="已建立節點" />
        <CompactMetric label="直接連結" value={`${directConnections} 位`} helper="連到主客戶" />
        <CompactMetric label="人物資料" value={`${profiledMembers} 位`} helper={`可聯絡 ${withPhone} 位`} />
      </div>

      <div
        data-relationship-graph-source={graphSource}
        data-relationship-graph-status={bffGraphStatus}
      >
        <RelationshipMap
          client={client}
          graphReview={graphReview}
          onAddChild={openDialogForNodeAsChild}
          onAddParent={openDialogForNodeAsParent}
        />
      </div>

      <RelationshipGraphSourceReview graph={graphReview} />

      {client.family.length === 0 ? (
        <EmptyRelatedState
          icon={Info}
          title="尚無關係人資料"
          description="新增配偶、子女或其他關鍵關係人後，系統會用同一份資料更新關係圖與後續訪談線索。"
        />
      ) : (
        <Card>
          <CardHeader className="border-b border-hairline pb-4">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" strokeWidth={1.5} />
              關係人清單
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-hairline">
              {client.family.map((member) => {
                const parentName =
                  member.parentMemberId
                    ? client.family.find((candidate) => candidate.id === member.parentMemberId)?.name ??
                      "主客戶"
                    : "主客戶";
                const profileFieldCount = countProfileFields(member.profile);
                const profileUnknownCount = countProfileFieldsByStatus(member.profile, "UNKNOWN");
                const isEditingProfile = editingProfileMemberId === member.id;
                const profileDraft = profileDraftByMemberId[member.id] ?? createProfileDraft(member);
                const isSavingProfile = savingProfileMemberId === member.id;

                return (
                  <div
                    key={member.id}
                    className="px-5 py-4 transition-colors hover:bg-paper-2/60"
                    data-family-profile-editor-row={member.id}
                  >
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_150px_180px]">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-hairline bg-paper-2 text-sm font-semibold text-foreground">
                          {member.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {member.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {member.age ? `${member.age} 歲・` : ""}
                            連結至 {parentName}
                            {member.phone ? `・${member.phone}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Badge variant="secondary" className="h-6 text-[11px]">
                          {member.relation}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ShieldCheck className="h-4 w-4 text-primary" strokeWidth={1.5} />
                        <span>{profileFieldCount > 0 ? `${profileFieldCount} 欄` : "待補資料"}</span>
                        {profileUnknownCount > 0 ? (
                          <Badge variant="outline" className="h-5 text-[10px]">
                            待確認 {profileUnknownCount}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-start gap-2 md:justify-end">
                        <Button
                          type="button"
                          variant={isEditingProfile ? "monoOutline" : "outline"}
                          size="sm"
                          className="rounded-full"
                          onClick={() => (isEditingProfile ? closeProfileEditor() : openProfileEditor(member))}
                        >
                          {isEditingProfile ? (
                            <X className="h-4 w-4" strokeWidth={1.5} />
                          ) : (
                            <PencilLine className="h-4 w-4" strokeWidth={1.5} />
                          )}
                          {isEditingProfile ? "收合" : "人物資料"}
                        </Button>
                        <IconAction
                          label={`刪除 ${member.name}`}
                          icon={Trash2}
                          variant="ghost"
                          disabled={deletingMemberId === member.id}
                          onClick={() => void handleDeleteMember(member.id, member.name)}
                        />
                      </div>
                    </div>
                    {isEditingProfile ? (
                      <FamilyProfileEditor
                        member={member}
                        draft={profileDraft}
                        saving={isSavingProfile}
                        onFieldChange={(fieldKey, patch) => updateProfileDraft(member.id, fieldKey, patch)}
                        onSave={() => void handleSaveProfile(member)}
                        onClear={() => void handleClearProfile(member)}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FamilyProfileEditor({
  member,
  draft,
  saving,
  onFieldChange,
  onSave,
  onClear,
}: {
  member: FamilyMember;
  draft: ProfileDraft;
  saving: boolean;
  onFieldChange: (fieldKey: ProfileFieldKey, patch: Partial<ProfileFieldDraft>) => void;
  onSave: () => void;
  onClear: () => void;
}) {
  return (
    <div
      className="mt-4 rounded-lg border border-hairline bg-paper p-4"
      data-family-profile-editor="true"
    >
      <div className="flex flex-col gap-3 border-b border-hairline pb-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{member.name} 的人物資料</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            只保存 allowlisted profile 欄位；來源標記為關係圖顧問輸入，不寫回 CRM confirmed fact。
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={saving}
            onClick={onClear}
          >
            清空資料
          </Button>
          <Button
            type="button"
            variant="mono"
            size="sm"
            className="rounded-full"
            disabled={saving}
            onClick={onSave}
          >
            <Save className="h-4 w-4" strokeWidth={1.5} />
            {saving ? "儲存中" : "儲存"}
          </Button>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        {PROFILE_FIELD_CONFIG.map((field) => (
          <div
            key={field.key}
            className="grid gap-2 rounded-md border border-hairline bg-paper-2 p-3 lg:grid-cols-[180px_minmax(0,1fr)_132px]"
            data-family-profile-field={field.key}
          >
            <label className="text-xs font-semibold text-muted-foreground" htmlFor={`${member.id}-${field.key}`}>
              {field.label}
            </label>
            <Input
              id={`${member.id}-${field.key}`}
              value={draft[field.key].value}
              placeholder={field.placeholder}
              disabled={saving}
              onChange={(event) => onFieldChange(field.key, { value: event.target.value })}
            />
            <label className="sr-only" htmlFor={`${member.id}-${field.key}-status`}>
              {field.label} 狀態
            </label>
            <select
              id={`${member.id}-${field.key}-status`}
              value={draft[field.key].factStatus}
              disabled={saving}
              className="h-9 rounded-lg border border-input bg-surface px-3 text-sm text-foreground outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-50"
              onChange={(event) =>
                onFieldChange(field.key, {
                  factStatus: event.target.value as FamilyMemberProfileFactStatus,
                })
              }
            >
              {PROFILE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div className="lg:col-start-2 lg:col-end-4">
              <label className="sr-only" htmlFor={`${member.id}-${field.key}-rationale`}>
                {field.label} 推論依據
              </label>
              <Textarea
                id={`${member.id}-${field.key}-rationale`}
                value={draft[field.key].rationale}
                placeholder="補一行依據或待確認原因；留空也可以。"
                disabled={saving}
                className="min-h-12"
                onChange={(event) => onFieldChange(field.key, { rationale: event.target.value })}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function createProfileDraft(member: FamilyMember): ProfileDraft {
  return PROFILE_FIELD_CONFIG.reduce((draft, field) => {
    const profileField = member.profile?.[field.key];
    return {
      ...draft,
      [field.key]: createProfileFieldDraft(profileField),
    };
  }, createEmptyProfileDraft());
}

function buildFamilyGraphSignature(family: FamilyMember[]): string {
  return family
    .map((member) =>
      [
        member.id,
        member.name,
        member.relation,
        member.parentMemberId ?? "",
        member.linkedClientId ?? "",
        member.profile ? JSON.stringify(member.profile) : "",
      ].join(":"),
    )
    .join("|");
}

function createEmptyProfileDraft(): ProfileDraft {
  return PROFILE_FIELD_CONFIG.reduce((draft, field) => {
    return {
      ...draft,
      [field.key]: {
        value: "",
        factStatus: "UNKNOWN" as const,
        rationale: "",
      },
    };
  }, {} as ProfileDraft);
}

function createProfileFieldDraft(field: FamilyMemberProfileField | undefined): ProfileFieldDraft {
  return {
    value: field?.value ?? "",
    factStatus: field?.factStatus ?? "UNKNOWN",
    rationale: field?.rationale ?? "",
  };
}

function buildProfilePayload(member: FamilyMember, draft: ProfileDraft): FamilyMemberProfile | null {
  const profileFields = PROFILE_FIELD_CONFIG.flatMap((field) => {
    const fieldDraft = draft[field.key];
    const value = fieldDraft.value.trim();

    if (!value) return [];

    return [
      {
        key: field.key,
        field: {
          value,
          factStatus: fieldDraft.factStatus,
          sourceReferenceIds: [familyProfileAdvisorSourceId(member.id)],
          ...(fieldDraft.rationale.trim() ? { rationale: fieldDraft.rationale.trim() } : {}),
        } satisfies FamilyMemberProfileField,
      },
    ];
  });

  if (profileFields.length === 0) return null;

  return {
    schemaVersion: FAMILY_MEMBER_PROFILE_SCHEMA_VERSION,
    ...Object.fromEntries(profileFields.map((item) => [item.key, item.field])),
    sourceReferences: [
      {
        id: familyProfileAdvisorSourceId(member.id),
        type: "relationship_graph",
        label: "顧問輸入",
        summary: "顧問在關係圖人物資料編輯器更新。",
        factStatus: aggregateProfileFactStatus(profileFields.map((item) => item.field.factStatus)),
      },
    ],
  } as FamilyMemberProfile;
}

function familyProfileAdvisorSourceId(memberId: string) {
  return `advisor_profile_${memberId}`.slice(0, 80);
}

function aggregateProfileFactStatus(
  statuses: FamilyMemberProfileFactStatus[],
): FamilyMemberProfileFactStatus {
  if (statuses.some((status) => status === "INFERENCE")) return "INFERENCE";
  if (statuses.some((status) => status === "UNKNOWN")) return "UNKNOWN";
  return "FACT";
}

function countProfileFields(profile: FamilyMemberProfile | undefined): number {
  if (!profile) return 0;
  return PROFILE_FIELD_CONFIG.filter((field) => Boolean(profile[field.key]?.value)).length;
}

function countProfileFieldsByStatus(
  profile: FamilyMemberProfile | undefined,
  status: FamilyMemberProfileFactStatus,
): number {
  if (!profile) return 0;
  return PROFILE_FIELD_CONFIG.filter((field) => profile[field.key]?.factStatus === status).length;
}
