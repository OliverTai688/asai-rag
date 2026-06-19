import type { Client } from "@/domains/client/types";
import type { AppSession } from "@/lib/auth/session";
import { getClientForMember } from "@/lib/clients/client-repository";

const KYC_STATUS_LABEL: Record<string, string> = {
  COMPLETED: "已完成",
  IN_PROGRESS: "進行中",
  MISSING: "未完成",
  EXPIRED: "已過期",
};

const SENSITIVITY_LABEL: Record<string, string> = {
  NORMAL: "一般",
  SENSITIVE: "敏感",
  HIGHLY_SENSITIVE: "高敏感",
};

export type InterviewClientContext = {
  client: Client | null;
  /** One confirmed-fact line per known CRM field, for the memory rail / known materials. */
  facts: string[];
  /** A ready-to-embed prompt block describing the loaded client, or "" when none. */
  promptBlock: string;
};

const EMPTY_CONTEXT: InterviewClientContext = { client: null, facts: [], promptBlock: "" };

/**
 * Load the selected CRM client's full record (family, policies, gap tags, compliance)
 * and turn it into confirmed-fact context for the interview Agent. Returns an empty
 * context for independent mode or when the member cannot read the client, so the
 * conversation never fails — it simply runs without preloaded facts.
 */
export async function loadInterviewClientContext(
  session: AppSession,
  clientId: string | undefined,
): Promise<InterviewClientContext> {
  if (!clientId) {
    return EMPTY_CONTEXT;
  }

  const client = await getClientForMember(session, clientId);
  if (!client) {
    return EMPTY_CONTEXT;
  }

  const facts = buildClientFacts(client);
  const promptBlock = [
    "已從 CRM 載入本次拜訪客戶的資料，以下皆為「已確認事實」。請直接據此追問缺口，不要重複詢問已知欄位，也不要把這些事實再當成未知。",
    ...facts.map((fact) => `- ${fact}`),
  ].join("\n");

  return { client, facts, promptBlock };
}

function buildClientFacts(client: Client): string[] {
  const facts: string[] = [`姓名：${client.name}`];

  if (client.birthDate) {
    const age = computeAge(client.birthDate);
    facts.push(`出生日期：${client.birthDate}${age !== null ? `（約 ${age} 歲）` : ""}`);
  }
  if (client.occupation) {
    facts.push(`職業：${client.occupation}`);
  }
  if (client.annualIncome) {
    facts.push(`年收入：${client.annualIncome.toLocaleString("zh-TW")}`);
  }

  if (client.family.length) {
    const family = client.family
      .map((member) => {
        const age = member.age !== undefined ? `（${member.age} 歲）` : "";
        return `${member.relation}${member.name ? ` ${member.name}` : ""}${age}`;
      })
      .join("、");
    facts.push(`家庭成員：${family}`);
  } else {
    facts.push("家庭成員：CRM 尚無紀錄（待確認）");
  }

  if (client.existingPolicies.length) {
    const policies = client.existingPolicies
      .map((policy) => {
        const amount = policy.amount ? ` 保額 ${policy.amount.toLocaleString("zh-TW")}` : "";
        return `${policy.type}（${policy.provider}）${amount}`.trim();
      })
      .join("、");
    facts.push(`現有保單：${policies}`);
  } else {
    facts.push("現有保單：CRM 尚無紀錄（待確認）");
  }

  if (client.tags.length) {
    facts.push(`客戶標籤：${client.tags.join("、")}`);
  }
  if (client.aiTags.length) {
    facts.push(`AI 需求缺口標籤：${client.aiTags.join("、")}`);
  }

  facts.push(`敏感度：${SENSITIVITY_LABEL[client.sensitivityLevel] ?? client.sensitivityLevel}`);
  facts.push(`KYC 狀態：${KYC_STATUS_LABEL[client.kycStatus] ?? client.kycStatus}`);

  return facts;
}

function computeAge(birthDate: string): number | null {
  const parsed = new Date(birthDate);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const now = new Date();
  let age = now.getFullYear() - parsed.getFullYear();
  const monthDiff = now.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < parsed.getDate())) {
    age -= 1;
  }

  return age >= 0 && age < 130 ? age : null;
}
