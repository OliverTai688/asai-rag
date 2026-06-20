import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ClientStatus, ReportStatus } from "@/generated/prisma/enums";
import { canReadClientDetail } from "@/lib/auth/policies";
import type { AppSession } from "@/lib/auth/session";
import { sanitizeShareEventPayload } from "@/lib/api/sanitize";
import { getReportPurposeMeta } from "@/domains/report/blueprints";
import { reportService } from "@/domains/report/service";
import { INTERNAL_ONLY_SECTION_TYPES, type ReportSection, type ReportSectionType } from "@/domains/report/types";
import { toClientDto, type ClientRecord } from "@/lib/clients/client-dto";
import { prisma } from "@/lib/prisma";
import { toReportDto, type ReportRecord } from "./report-dto";

const CUID_PATTERN = /^c[a-z0-9]{20,}$/;

const reportInclude = {
  client: { select: { id: true, name: true, organizationId: true, unitId: true, ownerId: true } },
  shares: { orderBy: { createdAt: "desc" } },
} as const;

const interviewOutputSchema = z.object({
  clientProfile: z
    .object({
      relationship: z.string().catch(""),
      family: z.string().catch(""),
      workIncome: z.string().catch(""),
      existingCoverage: z.string().catch(""),
      knownFacts: z.array(z.string()).catch([]),
      unknownsToConfirm: z.array(z.string()).catch([]),
      likelyIssues: z.array(z.string()).catch([]),
      decisionContext: z.string().catch(""),
      communicationNotes: z.string().catch(""),
    })
    .catch({
      relationship: "",
      family: "",
      workIncome: "",
      existingCoverage: "",
      knownFacts: [],
      unknownsToConfirm: [],
      likelyIssues: [],
      decisionContext: "",
      communicationNotes: "",
    }),
  conversationPrepCard: z
    .object({
      opening: z.string().catch(""),
      talkTracks: z.array(z.string()).catch([]),
      firstQuestions: z.array(z.string()).catch([]),
      landmines: z.array(z.string()).catch([]),
      desiredNextStep: z.string().catch(""),
    })
    .catch({
      opening: "",
      talkTracks: [],
      firstQuestions: [],
      landmines: [],
      desiredNextStep: "",
    }),
  spinQuestionCandidates: z
    .array(z.object({ phase: z.string().catch("SITUATION"), question: z.string().catch("") }))
    .catch([]),
  pqQuestions: z.array(z.string()).catch([]),
  issueReadiness: z
    .array(
      z.object({
        label: z.string().catch(""),
        level: z.coerce.number().catch(0),
        reason: z.string().catch(""),
        nextStep: z.string().catch(""),
      }),
    )
    .catch([]),
  personalityInference: z.string().catch(""),
  complianceNotes: z.array(z.string()).catch([]),
});

export const createInterviewReportInputSchema = z.object({
  interviewSessionId: z.string().trim().max(120).optional(),
  title: z.string().trim().max(120).optional(),
  output: interviewOutputSchema,
});

export type CreateInterviewReportInput = z.infer<typeof createInterviewReportInputSchema>;
type InterviewOutput = z.infer<typeof interviewOutputSchema>;

type ReportSectionDraft = { type: string; title: string; content: string };

const reportPurposeSchema = z.enum([
  "comprehensive",
  "proposal",
  "policy_review",
  "family_protection",
  "retirement",
  "follow_up",
]);

const reportSectionTypeSchema = z.enum([
  "situation",
  "problem",
  "implication",
  "recommendation",
  "summary",
  "performance",
  "cover",
  "methodology",
  "analysis",
  "family",
  "action",
  "compliance",
  "appendix",
]);

const reportSectionInputSchema = z.object({
  id: z.string().trim().max(120).optional(),
  type: reportSectionTypeSchema.default("summary"),
  title: z.string().trim().min(1).max(160),
  content: z.string().trim().min(1).max(20000),
});

export const createReportInputSchema = z.object({
  clientId: z.string().trim().min(1).max(120),
  purpose: reportPurposeSchema.default("comprehensive"),
  goal: z.string().trim().max(240).optional().or(z.literal("")),
  title: z.string().trim().max(160).optional().or(z.literal("")),
  sections: z.array(reportSectionInputSchema).max(12).optional(),
});

export const updateReportInputSchema = z.object({
  sectionId: z.string().trim().min(1).max(160),
  content: z.string().trim().min(1).max(20000),
});

export const shareReportInputSchema = z
  .object({
    source: z.string().trim().max(80).optional(),
  })
  .optional()
  .default({});

export type CreateReportInput = z.infer<typeof createReportInputSchema>;
export type UpdateReportInput = z.infer<typeof updateReportInputSchema>;
export type ShareReportInput = z.infer<typeof shareReportInputSchema>;

const clientReportInclude = {
  complianceChecklist: true,
  familyMembers: { orderBy: { createdAt: "asc" } },
  policies: { orderBy: { createdAt: "asc" } },
} as const;

export async function listReportsForMember(session: AppSession, options: { clientId?: string } = {}) {
  const records = await prisma.report.findMany({
    where: {
      organizationId: session.organization.id,
      ...(options.clientId ? { clientId: options.clientId } : {}),
      client: {
        ownerId: session.user.id,
        organizationId: session.organization.id,
        status: { not: ClientStatus.ARCHIVED },
      },
    },
    include: reportInclude,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });

  return records.map((record) => toReportDto(record as ReportRecord));
}

export async function getReportForMember(session: AppSession, reportId: string) {
  const record = await findReadableReportRecord(session, reportId);
  return record ? toReportDto(record) : null;
}

export async function createReportForMember(session: AppSession, input: CreateReportInput) {
  const client = await prisma.client.findFirst({
    where: {
      id: input.clientId,
      organizationId: session.organization.id,
      status: { not: ClientStatus.ARCHIVED },
    },
    include: clientReportInclude,
  });

  if (!client || !canReadClientDetail(session, client)) {
    return null;
  }

  const clientDto = toClientDto(client as ClientRecord);
  const purpose = input.purpose;
  const meta = getReportPurposeMeta(purpose);
  const generated = input.sections?.length
    ? toSectionsFromInput(input.sections)
    : reportService.generateReport({
        clientId: clientDto.id,
        clientName: clientDto.name,
        purpose,
        goal: input.goal?.trim() || undefined,
        client: clientDto,
      }).sections;
  const clientSections = toClientSections(generated);

  const record = await prisma.report.create({
    data: {
      organizationId: session.organization.id,
      unitId: client.unitId ?? session.membership.primaryUnitId,
      clientId: client.id,
      ownerId: session.user.id,
      title: input.title?.trim() || `${client.name} ${meta.label}`,
      status: ReportStatus.DRAFT,
      internalSections: generated as unknown as Prisma.InputJsonValue,
      clientSections: clientSections as unknown as Prisma.InputJsonValue,
    },
    include: reportInclude,
  });

  return toReportDto(record as ReportRecord);
}

export async function updateReportForMember(session: AppSession, reportId: string, input: UpdateReportInput) {
  const record = await findReadableReportRecord(session, reportId);

  if (!record) {
    return null;
  }

  const sections = toEditableSections(record.internalSections ?? record.clientSections);
  const sectionIndex = sections.findIndex((section) => section.id === input.sectionId);

  if (sectionIndex < 0) {
    return { error: "REPORT_SECTION_NOT_FOUND" as const };
  }

  const nextSections = sections.map((section, index) =>
    index === sectionIndex
      ? {
          ...section,
          content: input.content,
          isEdited: true,
        }
      : section,
  );

  const updated = await prisma.report.update({
    where: { id: reportId },
    data: {
      internalSections: nextSections as unknown as Prisma.InputJsonValue,
      clientSections: toClientSections(nextSections) as unknown as Prisma.InputJsonValue,
      isEdited: true,
      version: { increment: 1 },
    },
    include: reportInclude,
  });

  return toReportDto(updated as ReportRecord);
}

export async function shareReportForMember(session: AppSession, reportId: string, input: ShareReportInput = {}) {
  const record = await findReadableReportRecord(session, reportId);

  if (!record) {
    return null;
  }

  const updated = await prisma.$transaction(async (tx) => {
    const existingShare = await tx.reportShare.findFirst({
      where: {
        reportId,
        organizationId: session.organization.id,
      },
      orderBy: { createdAt: "desc" },
    });

    const share =
      existingShare ??
      (await tx.reportShare.create({
        data: {
          organizationId: record.organizationId,
          unitId: record.unitId,
          reportId,
          ctaConfig: {
            primaryLabel: "預約下一步",
            primaryHref: "#next-step",
            secondaryLabel: "登入客戶入口",
            secondaryHref: "/client-login",
          },
          isDemo: record.isDemo,
          demoScenario: record.demoScenario,
          demoSeedVersion: record.demoSeedVersion,
        },
      }));

    await tx.shareEvent.create({
      data: {
        organizationId: share.organizationId,
        unitId: share.unitId,
        shareId: share.id,
        type: "CLICK",
        payload: sanitizeShareEventPayload({
          source: input.source || "member_report_share_action",
          label: existingShare ? "reuse_share_link" : "create_share_link",
          href: `/share/${share.token}`,
        }),
      },
    });

    return tx.report.update({
      where: { id: reportId },
      data: { status: ReportStatus.SHARED },
      include: reportInclude,
    });
  });

  return toReportDto(updated as ReportRecord);
}

export async function listReportsForClient(session: AppSession, clientId: string) {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId: session.organization.id,
      status: { not: ClientStatus.ARCHIVED },
    },
    select: { organizationId: true, unitId: true, ownerId: true },
  });

  if (!client || !canReadClientDetail(session, client)) {
    return null;
  }

  const records = await prisma.report.findMany({
    where: {
      clientId,
      organizationId: session.organization.id,
    },
    include: reportInclude,
    orderBy: { createdAt: "desc" },
  });

  return records.map((record) => toReportDto(record as ReportRecord));
}

export async function createReportFromInterview(
  session: AppSession,
  clientId: string,
  input: CreateInterviewReportInput,
) {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      organizationId: session.organization.id,
      status: { not: ClientStatus.ARCHIVED },
    },
    select: { id: true, organizationId: true, unitId: true, ownerId: true },
  });

  if (!client || !canReadClientDetail(session, client)) {
    return null;
  }

  const interviewSessionId = await resolveInterviewSessionId(session, clientId, input.interviewSessionId);
  const internalSections = buildInternalSections(input.output);
  const clientSections = buildClientSections(input.output);

  const record = await prisma.report.create({
    data: {
      organizationId: session.organization.id,
      unitId: session.membership.primaryUnitId,
      clientId,
      ownerId: session.user.id,
      interviewSessionId,
      title: input.title?.trim() || `AI 了解客戶摘要 - ${new Date().toISOString().slice(0, 10)}`,
      status: ReportStatus.DRAFT,
      internalSections: internalSections as Prisma.InputJsonValue,
      clientSections: clientSections as Prisma.InputJsonValue,
    },
    include: reportInclude,
  });

  return toReportDto(record as ReportRecord);
}

async function findReadableReportRecord(session: AppSession, reportId: string): Promise<ReportRecord | null> {
  const record = await prisma.report.findFirst({
    where: {
      id: reportId,
      organizationId: session.organization.id,
      client: {
        organizationId: session.organization.id,
        status: { not: ClientStatus.ARCHIVED },
      },
    },
    include: reportInclude,
  });

  if (!record || !record.client || !canReadClientDetail(session, record.client)) {
    return null;
  }

  return record as ReportRecord;
}

function toSectionsFromInput(sections: Array<z.infer<typeof reportSectionInputSchema>>): ReportSection[] {
  return sections.map((section, index) => ({
    id: section.id?.trim() || `section-${index + 1}`,
    type: section.type,
    title: section.title,
    content: section.content,
  }));
}

function toEditableSections(value: unknown): ReportSection[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry, index): ReportSection | null => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null;
      }

      const raw = entry as Record<string, unknown>;
      const title = typeof raw.title === "string" && raw.title.trim() ? raw.title.trim() : `報告區塊 ${index + 1}`;
      const content = typeof raw.content === "string" ? raw.content : "";

      return {
        id: typeof raw.id === "string" && raw.id ? raw.id : `section-${index + 1}`,
        type: normalizeReportSectionType(raw.type),
        title,
        content,
        isEdited: raw.isEdited === true,
      };
    })
    .filter((section): section is ReportSection => section !== null);
}

function toClientSections(sections: ReportSection[]): ReportSection[] {
  return sections.filter((section) => !INTERNAL_ONLY_SECTION_TYPES.includes(section.type));
}

function normalizeReportSectionType(value: unknown): ReportSectionType {
  if (typeof value !== "string") {
    return "summary";
  }

  const parsed = reportSectionTypeSchema.safeParse(value.toLowerCase());
  return parsed.success ? parsed.data : "summary";
}

async function resolveInterviewSessionId(
  session: AppSession,
  clientId: string,
  candidate: string | undefined,
): Promise<string | undefined> {
  if (!candidate || !CUID_PATTERN.test(candidate)) {
    return undefined;
  }

  const dbSession = await prisma.interviewSession.findFirst({
    where: {
      id: candidate,
      organizationId: session.organization.id,
      ownerId: session.user.id,
      clientId,
    },
    select: { id: true },
  });

  return dbSession?.id;
}

function buildInternalSections(output: InterviewOutput): ReportSectionDraft[] {
  const sections: ReportSectionDraft[] = [];
  const profile = output.clientProfile;

  sections.push({
    type: "SUMMARY",
    title: "客戶輪廓摘要",
    content: bulletBlock([
      profile.relationship && `關係背景：${profile.relationship}`,
      profile.family && `家庭：${profile.family}`,
      profile.workIncome && `工作與收入：${profile.workIncome}`,
      profile.existingCoverage && `現有保障：${profile.existingCoverage}`,
      profile.decisionContext && `決策情境：${profile.decisionContext}`,
      profile.communicationNotes && `溝通注意：${profile.communicationNotes}`,
    ]),
  });

  if (profile.knownFacts.length || profile.unknownsToConfirm.length) {
    sections.push({
      type: "SITUATION",
      title: "已確認事實與待確認",
      content: [
        profile.knownFacts.length ? `**已確認**\n${bulletList(profile.knownFacts)}` : "",
        profile.unknownsToConfirm.length ? `**待確認**\n${bulletList(profile.unknownsToConfirm)}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
  }

  if (profile.likelyIssues.length || output.issueReadiness.length) {
    sections.push({
      type: "PROBLEM",
      title: "可能議題與成熟度",
      content: [
        profile.likelyIssues.length ? bulletList(profile.likelyIssues) : "",
        output.issueReadiness.length
          ? bulletList(output.issueReadiness.map((issue) => `${issue.label}（L${issue.level}）：${issue.reason}`))
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
  }

  sections.push({
    type: "RECOMMENDATION",
    title: "對話準備卡",
    content: bulletBlock([
      output.conversationPrepCard.opening && `開場：${output.conversationPrepCard.opening}`,
      output.conversationPrepCard.talkTracks.length
        ? `談話主線：\n${bulletList(output.conversationPrepCard.talkTracks)}`
        : "",
      output.conversationPrepCard.firstQuestions.length
        ? `起手問題：\n${bulletList(output.conversationPrepCard.firstQuestions)}`
        : "",
      output.conversationPrepCard.desiredNextStep && `期望下一步：${output.conversationPrepCard.desiredNextStep}`,
    ]),
  });

  const performanceParts = [
    output.personalityInference ? `**人格推論（內部參考）**\n${output.personalityInference}` : "",
    output.complianceNotes.length ? `**合規提醒**\n${bulletList(output.complianceNotes)}` : "",
    output.conversationPrepCard.landmines.length
      ? `**地雷提醒**\n${bulletList(output.conversationPrepCard.landmines)}`
      : "",
  ].filter(Boolean);

  if (performanceParts.length) {
    sections.push({
      type: "PERFORMANCE",
      title: "內部備註",
      content: performanceParts.join("\n\n"),
    });
  }

  return sections;
}

function buildClientSections(output: InterviewOutput): ReportSectionDraft[] {
  const sections: ReportSectionDraft[] = [];
  const profile = output.clientProfile;

  const summaryLines = [
    profile.relationship && profile.relationship,
    profile.existingCoverage && `現有保障：${profile.existingCoverage}`,
  ].filter(Boolean) as string[];

  if (summaryLines.length) {
    sections.push({ type: "SUMMARY", title: "本次了解重點", content: bulletList(summaryLines) });
  }

  if (profile.likelyIssues.length) {
    sections.push({ type: "PROBLEM", title: "值得一起檢視的方向", content: bulletList(profile.likelyIssues) });
  }

  if (output.conversationPrepCard.desiredNextStep) {
    sections.push({
      type: "RECOMMENDATION",
      title: "建議的下一步",
      content: output.conversationPrepCard.desiredNextStep,
    });
  }

  return sections;
}

function bulletBlock(lines: (string | false | "")[]): string {
  const filtered = lines.filter((line): line is string => Boolean(line));
  return filtered.length ? filtered.join("\n\n") : "尚無明確內容。";
}

function bulletList(items: string[]): string {
  return items
    .filter((item) => item && item.trim())
    .map((item) => `- ${item.trim()}`)
    .join("\n");
}
