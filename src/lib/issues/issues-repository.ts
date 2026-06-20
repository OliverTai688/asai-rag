import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import {
  AuditAction,
  AuditSensitivity,
  IssuePriority,
  IssueStatus,
} from "@/generated/prisma/enums";
import {
  ISSUE_READINESS_DIMENSIONS,
  evaluateIssueReadiness,
} from "@/domains/interview/issue-maturity";
import type { IssueReadinessDimension } from "@/domains/interview/types";
import type {
  AdvisorIssueDto,
  AdvisorIssueEvidenceItem,
  AdvisorIssueListDto,
  AdvisorIssueNextAction,
  AdvisorIssuePriority,
  AdvisorIssueStatus,
} from "@/domains/issues/types";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const issueInclude = {
  reporter: { select: { id: true, name: true } },
  assignee: { select: { id: true, name: true } },
} as const;

type IssueRecord = Prisma.IssueGetPayload<{ include: typeof issueInclude }>;

export const listIssuesQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
});

export const updateIssueInputSchema = z
  .object({
    status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
    feedback: z.string().trim().max(4000).optional(),
    assignment: z.enum(["SELF", "UNASSIGNED"]).optional(),
  })
  .refine((input) => Boolean(input.status || input.feedback !== undefined || input.assignment), {
    message: "At least one issue action is required.",
  });

export type ListIssuesQuery = z.infer<typeof listIssuesQuerySchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueInputSchema>;

export async function listIssuesForMember(
  session: AppSession,
  query: ListIssuesQuery = {},
): Promise<AdvisorIssueListDto> {
  const records = await prisma.issue.findMany({
    where: buildScopedWhere(session, query),
    include: issueInclude,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return {
    issues: records.map((record) => toIssueDto(record, session.user.id)),
    generatedAt: new Date().toISOString(),
    source: "database",
    visibility: "member-scoped",
  };
}

export async function updateIssueForMember(
  session: AppSession,
  issueId: string,
  input: UpdateIssueInput,
): Promise<AdvisorIssueDto | null> {
  if (!UUID_PATTERN.test(issueId)) {
    return null;
  }

  const existing = await prisma.issue.findFirst({
    where: buildScopedWhere(session, { issueId }),
    include: issueInclude,
  });

  if (!existing) {
    return null;
  }

  const nextFeedback =
    input.feedback === undefined ? undefined : input.feedback.trim().length > 0 ? input.feedback.trim() : null;
  const data: Prisma.IssueUpdateInput = {};

  if (input.status) {
    data.status = input.status as IssueStatus;
  }

  if (nextFeedback !== undefined) {
    data.feedback = nextFeedback;
  }

  if (input.assignment === "SELF") {
    data.assignee = { connect: { id: session.user.id } };
  } else if (input.assignment === "UNASSIGNED") {
    data.assignee = { disconnect: true };
  }

  const updated = await prisma.$transaction(async (tx) => {
    const issue = await tx.issue.update({
      where: { id: existing.id },
      data,
      include: issueInclude,
    });

    await tx.auditLog.create({
      data: {
        organizationId: session.organization.id,
        actorUserId: session.user.id,
        action: AuditAction.SUPPORT_NOTE,
        sensitivity: AuditSensitivity.LOW,
        resourceType: "ISSUE",
        resourceId: existing.id,
        reason: "Issue status/action update from member BFF.",
        metadata: {
          source: "bff_issues",
          previousStatus: existing.status,
          nextStatus: issue.status,
          previousAssigneeId: existing.assigneeId,
          nextAssigneeId: issue.assigneeId,
          feedbackChanged: nextFeedback !== undefined,
          feedbackLength: issue.feedback?.length ?? 0,
          assignment: input.assignment ?? "UNCHANGED",
        } as Prisma.InputJsonValue,
      },
    });

    return issue;
  });

  return toIssueDto(updated, session.user.id);
}

function buildScopedWhere(
  session: AppSession,
  query: ListIssuesQuery & { issueId?: string },
): Prisma.IssueWhereInput {
  const andFilters: Prisma.IssueWhereInput[] = [
    {
      organizationId: session.organization.id,
      OR: [
        { reporterId: session.user.id },
        { assigneeId: session.user.id },
        { reporterId: null, assigneeId: null },
      ],
    },
  ];

  if (query.issueId) {
    andFilters.push({ id: query.issueId });
  }

  if (query.status) {
    andFilters.push({ status: query.status as IssueStatus });
  }

  if (query.priority) {
    andFilters.push({ priority: query.priority as IssuePriority });
  }

  if (query.q) {
    andFilters.push({
      OR: [
        { title: { contains: query.q } },
        { description: { contains: query.q } },
        { category: { contains: query.q } },
        { feedback: { contains: query.q } },
      ],
    });
  }

  return { AND: andFilters };
}

function toIssueDto(record: IssueRecord, currentUserId: string): AdvisorIssueDto {
  const facts = buildFactEvidence(record);
  const inferences = buildInferenceEvidence(record);
  const unknowns = buildUnknownEvidence(record);
  const readiness = evaluateIssueReadiness({
    issueKey: inferIssueKey(record),
    evidenceKinds: [
      "FACT",
      ...(record.feedback || record.status === IssueStatus.RESOLVED || record.status === IssueStatus.CLOSED
        ? (["CONFIRMED"] as const)
        : []),
      ...(inferences.length > 0 ? (["INFERENCE"] as const) : []),
      ...(unknowns.length > 0 ? (["UNKNOWN"] as const) : []),
    ],
    knownFactsCount: facts.length,
    hasProblemRepresentation: record.description.trim().length >= 20,
    hasRiskAndCopingAppraisal: hasRiskSignal(record),
    hasDecisionContext: Boolean(record.reporterId || record.assigneeId),
    hasAdvisorNextStep: Boolean(record.feedback || record.status !== IssueStatus.OPEN),
  });

  return {
    id: record.id,
    title: record.title,
    description: record.description,
    category: record.category,
    status: record.status as AdvisorIssueStatus,
    priority: record.priority as AdvisorIssuePriority,
    reporterName: record.reporter?.name ?? "未指定回報人",
    assigneeName: record.assignee?.name ?? null,
    feedback: record.feedback,
    images: record.images,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    evidence: { facts, inferences, unknowns },
    sourceReferences: [
      { id: record.id, label: "Issue DB record", type: "ISSUE_RECORD" },
      ...(record.reporter ? [{ id: record.reporter.id, label: "Reporter membership", type: "REPORTER" as const }] : []),
      { id: `${record.id}:status`, label: "Status / priority", type: "STATUS" },
      ...(record.feedback ? [{ id: `${record.id}:feedback`, label: "處理回覆", type: "FEEDBACK" as const }] : []),
    ],
    internalReadiness: {
      level: readiness.level,
      label: readiness.label,
      missingDimensions: readiness.missingDimensions.map(formatReadinessDimension),
      internalOnly: true,
      clientFacingVisible: false,
    },
    nextAction: buildNextAction(record, unknowns),
    actionState: {
      assignedToMe: record.assigneeId === currentUserId,
      canUpdateStatus: true,
    },
  };
}

function buildFactEvidence(record: IssueRecord): AdvisorIssueEvidenceItem[] {
  return [
    {
      id: `${record.id}:status`,
      label: "狀態與優先級",
      text: `目前狀態為 ${record.status}，優先級為 ${record.priority}。`,
      source: "Issue.status / Issue.priority",
    },
    {
      id: `${record.id}:category`,
      label: "議題分類",
      text: `分類為 ${record.category}。`,
      source: "Issue.category",
    },
    {
      id: `${record.id}:reporter`,
      label: "回報人",
      text: record.reporter?.name ? `由 ${record.reporter.name} 回報。` : "此議題尚未連結回報人。",
      source: "Issue.reporter",
    },
    {
      id: `${record.id}:created`,
      label: "建立時間",
      text: `建立於 ${record.createdAt.toISOString()}。`,
      source: "Issue.createdAt",
    },
  ];
}

function buildInferenceEvidence(record: IssueRecord): AdvisorIssueEvidenceItem[] {
  const items: AdvisorIssueEvidenceItem[] = [];

  if (record.priority === IssuePriority.HIGH || record.priority === IssuePriority.URGENT) {
    items.push({
      id: `${record.id}:priority-inference`,
      label: "高優先處理推論",
      text: "優先級顯示此議題可能影響當前顧問工作流，應先確認重現條件與影響範圍。",
      source: "Issue.priority",
    });
  }

  if (record.status === IssueStatus.IN_PROGRESS) {
    items.push({
      id: `${record.id}:status-inference`,
      label: "已有處理脈絡",
      text: "狀態為處理中，表示已有初步承辦或回覆，但仍需確認完成條件。",
      source: "Issue.status",
    });
  }

  if (record.feedback) {
    items.push({
      id: `${record.id}:feedback-inference`,
      label: "可追蹤處理方案",
      text: "已有處理回覆，可作為下一次驗證或結案檢查依據。",
      source: "Issue.feedback",
    });
  }

  return items;
}

function buildUnknownEvidence(record: IssueRecord): AdvisorIssueEvidenceItem[] {
  const items: AdvisorIssueEvidenceItem[] = [];

  if (!record.assigneeId) {
    items.push({
      id: `${record.id}:assignee-unknown`,
      label: "承辦人未知",
      text: "尚未指定承辦人或處理責任人。",
      source: "Issue.assigneeId",
    });
  }

  if (!record.feedback) {
    items.push({
      id: `${record.id}:feedback-unknown`,
      label: "處理回覆未知",
      text: "尚未留下處理回覆，因此不能把狀態解讀成已完成。",
      source: "Issue.feedback",
    });
  }

  if (record.description.trim().length < 80) {
    items.push({
      id: `${record.id}:context-unknown`,
      label: "影響範圍不足",
      text: "描述仍偏短，需要補充發生情境、重現步驟或期待結果。",
      source: "Issue.description",
    });
  }

  return items;
}

function buildNextAction(record: IssueRecord, unknowns: AdvisorIssueEvidenceItem[]): AdvisorIssueNextAction {
  if (record.status === IssueStatus.CLOSED) {
    return {
      label: "保留紀錄",
      description: "此議題已結案；只需在相同症狀再次出現時重新開啟。",
      actionType: "CLOSE",
    };
  }

  if (record.status === IssueStatus.RESOLVED) {
    return {
      label: "驗證是否復發",
      description: "請確認回報人已可完成原本卡住的流程，再決定是否結案。",
      actionType: "VERIFY_RESOLUTION",
    };
  }

  if (!record.assigneeId) {
    return {
      label: "指派處理人",
      description: "先指派責任人，避免高優先議題只停留在待處理清單。",
      actionType: "ASSIGN_OWNER",
    };
  }

  if (!record.feedback || unknowns.length > 0) {
    return {
      label: "補充處理脈絡",
      description: "補上目前判斷、需要的資訊與下一個可驗證動作。",
      actionType: "REQUEST_CONTEXT",
    };
  }

  return {
    label: "更新回覆",
    description: "用最新處理狀態回覆回報人，並同步下一步。",
    actionType: "RESPOND",
  };
}

function hasRiskSignal(record: IssueRecord): boolean {
  const text = `${record.title} ${record.description} ${record.category}`.toLowerCase();
  return (
    record.priority === IssuePriority.HIGH ||
    record.priority === IssuePriority.URGENT ||
    ["無法", "失敗", "錯誤", "風險", "卡住", "重疊", "漏"].some((token) => text.includes(token))
  );
}

function inferIssueKey(record: IssueRecord): string {
  const text = `${record.category} ${record.title} ${record.description}`.toLowerCase();

  if (text.includes("合規") || text.includes("kyc")) return "compliance_readiness";
  if (text.includes("保單") || text.includes("報告")) return "policy_clarity";
  if (text.includes("家庭") || text.includes("關係")) return "family_protection";
  if (text.includes("決策") || text.includes("轉介紹")) return "decision_alignment";

  return "decision_alignment";
}

function formatReadinessDimension(dimension: IssueReadinessDimension): string {
  return ISSUE_READINESS_DIMENSIONS[dimension] ?? dimension;
}
