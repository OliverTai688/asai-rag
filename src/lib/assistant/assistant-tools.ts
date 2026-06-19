import OpenAI from "openai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { AppSession } from "@/lib/auth/session";
import { canReadOrgAggregate } from "@/lib/auth/policies";
import { listClientsForMember } from "@/lib/clients/client-repository";
import type { Client } from "@/domains/client/types";

/**
 * Function-calling tools that let the global assistant ground its answers in the
 * caller's real, session-scoped data instead of only being able to navigate.
 *
 * Every tool resolves its scope from the trusted `AppSession` (never from model
 * arguments), so a member only ever sees their own clients and only managers/admins
 * can read the org aggregate. Tool results are intentionally compact + privacy-safe
 * summaries — never raw transcripts, contact details beyond what the owner already
 * has, or cross-member client detail.
 */
export const ASSISTANT_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "list_my_clients",
      description:
        "查詢目前登入業務員自己負責的客戶清單。可用於回答『本週/所有待開發客戶』、『高風險客戶』、『最近未聯繫的客戶』等問題。回傳每位客戶的姓名、狀態、年收入、標籤、AI 風險標籤、最後互動時間與 KYC 合規狀態。",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["PROSPECT", "ACTIVE", "CLOSED"],
            description: "依客戶狀態過濾：PROSPECT=待開發、ACTIVE=已成交在管、CLOSED=已結案。不填則回傳全部。",
          },
          query: {
            type: "string",
            description: "依姓名、標籤或 AI 標籤關鍵字過濾（例如『高風險』『退休』）。",
          },
          limit: {
            type: "number",
            description: "最多回傳幾筆，預設 20，上限 50。",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_client_summary",
      description:
        "依姓名或客戶 ID 查詢單一客戶的詳細摘要，包含家庭成員數、保單數與保額、KYC/適合度/同意合規狀態與 AI 標籤。回答特定客戶的保障缺口、近況時使用。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "客戶姓名或客戶 ID。",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_team_overview",
      description:
        "查詢通訊處/團隊的彙總指標：成員數、客戶數、訪前規劃數與已完成數、報告數與已完成/已分享數、SPIN 與劇場完成數、本月 AI 使用量。僅限主管 / 管理員角色，且只回傳彙總數字，不含任何個別客戶明細。",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

const listArgsSchema = z.object({
  status: z.enum(["PROSPECT", "ACTIVE", "CLOSED"]).optional(),
  query: z.string().trim().max(80).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

const summaryArgsSchema = z.object({
  query: z.string().trim().min(1).max(80),
});

/**
 * Execute a single assistant tool call. Always returns a JSON-serialisable value
 * (never throws) so the caller can feed it straight back to the model as a tool
 * message even when scope/permission/validation fails.
 */
export async function executeAssistantTool(
  session: AppSession,
  name: string,
  rawArgs: string,
): Promise<unknown> {
  let args: unknown = {};
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
  } catch {
    args = {};
  }

  try {
    switch (name) {
      case "list_my_clients":
        return await listMyClients(session, listArgsSchema.parse(args));
      case "get_client_summary":
        return await getClientSummary(session, summaryArgsSchema.parse(args));
      case "get_team_overview":
        return await getTeamOverview(session);
      default:
        return { error: "UNKNOWN_TOOL", message: `未知的工具：${name}` };
    }
  } catch (error) {
    return {
      error: "TOOL_FAILED",
      message: error instanceof Error ? error.message : "工具執行失敗。",
    };
  }
}

function toClientSummary(client: Client) {
  return {
    id: client.id,
    name: client.name,
    status: client.status,
    occupation: client.occupation || undefined,
    annualIncome: client.annualIncome,
    tags: client.tags,
    aiTags: client.aiTags,
    lastInteraction: client.lastInteraction,
    kycStatus: client.kycStatus,
    familyMemberCount: client.family.length,
    policyCount: client.existingPolicies.length,
  };
}

async function listMyClients(session: AppSession, args: z.infer<typeof listArgsSchema>) {
  const clients = await listClientsForMember(session);

  let filtered = clients;
  if (args.status) {
    filtered = filtered.filter((client) => client.status === args.status);
  }
  if (args.query) {
    const needle = args.query.toLowerCase();
    filtered = filtered.filter(
      (client) =>
        client.name.toLowerCase().includes(needle) ||
        client.tags.some((tag) => tag.toLowerCase().includes(needle)) ||
        client.aiTags.some((tag) => tag.toLowerCase().includes(needle)),
    );
  }

  const limit = args.limit ?? 20;

  return {
    totalMatched: filtered.length,
    returned: Math.min(filtered.length, limit),
    clients: filtered.slice(0, limit).map(toClientSummary),
  };
}

async function getClientSummary(session: AppSession, args: z.infer<typeof summaryArgsSchema>) {
  const clients = await listClientsForMember(session);
  const needle = args.query.toLowerCase();

  const match =
    clients.find((client) => client.id === args.query) ??
    clients.find((client) => client.name.toLowerCase() === needle) ??
    clients.find((client) => client.name.toLowerCase().includes(needle));

  if (!match) {
    return { error: "CLIENT_NOT_FOUND", message: `找不到符合「${args.query}」的客戶。` };
  }

  return {
    ...toClientSummary(match),
    compliance: {
      kycStatus: match.complianceChecklist.kycStatus,
      suitabilityStatus: match.complianceChecklist.suitabilityStatus,
      consentStatus: match.complianceChecklist.consentStatus,
      missingItems: match.complianceChecklist.missingItems,
    },
    family: match.family.map((member) => ({
      relation: member.relation,
      name: member.name,
      age: member.age,
    })),
    policies: match.existingPolicies.map((policy) => ({
      type: policy.type,
      provider: policy.provider,
      amount: policy.amount,
    })),
  };
}

async function getTeamOverview(session: AppSession) {
  const isManagerScoped =
    session.membership.role === "MANAGER" && session.membership.managedUnitIds.length > 0;
  const scope = {
    organizationId: session.organization.id,
    ...(isManagerScoped ? { unitId: { in: session.membership.managedUnitIds } } : {}),
  };

  const scopeAllowed = isManagerScoped
    ? session.membership.managedUnitIds.every((unitId) =>
        canReadOrgAggregate(session, { organizationId: session.organization.id, unitId }),
      )
    : canReadOrgAggregate(session, { organizationId: session.organization.id });

  if (!scopeAllowed) {
    return {
      error: "NO_PERMISSION",
      message: "目前的角色無法查看團隊彙總指標，此功能僅開放給主管或管理員。",
    };
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    activeMembers,
    clientCount,
    visitPlanCount,
    readyVisitPlanCount,
    reportCount,
    deliveredReportCount,
    spinCompletedCount,
    theaterCompletedCount,
    aiUsageThisMonth,
  ] = await Promise.all([
    prisma.organizationMember.count({
      where: {
        organizationId: session.organization.id,
        status: "ACTIVE",
        ...(isManagerScoped ? { primaryUnitId: { in: session.membership.managedUnitIds } } : {}),
      },
    }),
    prisma.client.count({ where: { ...scope, status: { not: "ARCHIVED" } } }),
    prisma.visitPlan.count({ where: scope }),
    prisma.visitPlan.count({ where: { ...scope, status: { in: ["READY", "COMPLETED"] } } }),
    prisma.report.count({ where: scope }),
    prisma.report.count({ where: { ...scope, status: { in: ["READY", "SHARED"] } } }),
    prisma.spinSession.count({ where: { ...scope, status: "COMPLETED" } }),
    prisma.theaterSession.count({ where: { ...scope, status: "COMPLETED" } }),
    prisma.aiUsageLog.count({ where: { ...scope, createdAt: { gte: monthStart } } }),
  ]);

  return {
    scope: isManagerScoped ? "managed-units" : "organization",
    activeMembers,
    clientCount,
    visitPlan: {
      total: visitPlanCount,
      readyOrCompleted: readyVisitPlanCount,
      completionRate: visitPlanCount > 0 ? Math.round((readyVisitPlanCount / visitPlanCount) * 100) : null,
    },
    report: {
      total: reportCount,
      deliveredOrShared: deliveredReportCount,
      completionRate: reportCount > 0 ? Math.round((deliveredReportCount / reportCount) * 100) : null,
    },
    spinCompletedCount,
    theaterCompletedCount,
    aiUsageThisMonth,
    note: "本系統未設定固定業績目標數，所謂『達成率』以訪前規劃/報告的完成比例呈現；若需明確業績目標，請於團隊設定中建立。",
  };
}
