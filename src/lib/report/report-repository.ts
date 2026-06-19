import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { ClientStatus, ReportStatus } from "@/generated/prisma/enums";
import { canReadClientDetail } from "@/lib/auth/policies";
import type { AppSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { toReportDto, type ReportRecord } from "./report-dto";

const CUID_PATTERN = /^c[a-z0-9]{20,}$/;

const reportInclude = {
  client: { select: { id: true, name: true } },
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
