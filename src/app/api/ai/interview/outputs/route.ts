import OpenAI from "openai";
import { z } from "zod";
import { AiModule, AiProvider } from "@/generated/prisma/enums";
import { ISSUE_CATEGORIES, ISSUE_READINESS_LEVELS, PQ_QUESTION_BANK } from "@/domains/interview/issue-maturity";
import { advisorCompanionOutline } from "@/domains/interview/outlines";
import { writeAiUsageLogSafely } from "@/lib/ai/usage-log";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o-mini";

const outputRequestSchema = z.object({
  organizationId: z.string().min(1),
  unitId: z.string().optional(),
  userId: z.string().optional(),
  clientId: z.string().optional(),
  sessionId: z.string().optional(),
  materials: z.array(z.string()).default([]),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
  })).default([]),
});

const safeStringSchema = z.string().catch("");
const safeStringArraySchema = z.array(z.string()).catch([]);
const issueReadinessLevelSchema = z.coerce
  .number()
  .int()
  .min(0)
  .max(5)
  .catch(0)
  .transform((level) => level as 0 | 1 | 2 | 3 | 4 | 5);

const outputDraftSchema = z.object({
  clientProfile: z.object({
    relationship: safeStringSchema,
    family: safeStringSchema,
    workIncome: safeStringSchema,
    existingCoverage: safeStringSchema,
    knownFacts: safeStringArraySchema,
    unknownsToConfirm: safeStringArraySchema,
    likelyIssues: safeStringArraySchema,
    decisionContext: safeStringSchema,
    communicationNotes: safeStringSchema,
  }).catch({
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
  conversationPrepCard: z.object({
    opening: safeStringSchema,
    talkTracks: safeStringArraySchema,
    firstQuestions: safeStringArraySchema,
    landmines: safeStringArraySchema,
    desiredNextStep: safeStringSchema,
  }).catch({
    opening: "",
    talkTracks: [],
    firstQuestions: [],
    landmines: [],
    desiredNextStep: "",
  }),
  spinQuestionCandidates: z.array(z.object({
    phase: z.enum(["SITUATION", "PROBLEM", "IMPLICATION", "NEED_PAYOFF"]).catch("SITUATION"),
    question: safeStringSchema,
  })).catch([]),
  pqQuestions: safeStringArraySchema,
  issueReadiness: z.array(z.object({
    issueKey: safeStringSchema,
    label: safeStringSchema,
    level: issueReadinessLevelSchema,
    reason: safeStringSchema,
    nextStep: safeStringSchema,
  })).catch([]),
  personalityInference: safeStringSchema,
  complianceNotes: safeStringArraySchema,
});

function buildOutputPrompt(materials: string[], messages: { role: "user" | "assistant"; content: string }[]): string {
  return [
    "你是誠問 AI 訪談 Agent 的輸出整理器。請把保險業務員的訪談素材整理成可編輯草稿。",
    "",
    "硬規則：",
    "1. 使用繁體中文。",
    "2. 不做商品建議、不保證、不製造恐懼壓迫。",
    "3. 只能把明確素材列入 knownFacts；推論要放在 likelyIssues 或 personalityInference，且保持不確定語氣。",
    "4. 不知道的資訊放 unknownsToConfirm，不得補造保單、收入、家庭成員、病史、資產數字。",
    "5. 人格只給白話推論，不顯分數、不貼硬類型標籤。",
    "6. issueReadiness 使用 Issue Readiness Level 0-5，不是成交率或客戶好壞評分。",
    "",
    `訪綱輸出 schema：${advisorCompanionOutline.outputSchema.map((field) => `${field.label}:${field.description ?? field.type}`).join("；")}`,
    `Issue 類別：${ISSUE_CATEGORIES.map((issue) => `${issue.key}=${issue.label}`).join("；")}`,
    `IRL 定義：${ISSUE_READINESS_LEVELS.map((level) => `${level.level}:${level.label}`).join("；")}`,
    `PQ 題庫候選：${PQ_QUESTION_BANK.map((question) => question.text).join(" / ")}`,
    "",
    "JSON 格式必須完全使用下列英文 key，不要改成中文 key：",
    JSON.stringify({
      clientProfile: {
        relationship: "string",
        family: "string",
        workIncome: "string",
        existingCoverage: "string",
        knownFacts: ["string"],
        unknownsToConfirm: ["string"],
        likelyIssues: ["string"],
        decisionContext: "string",
        communicationNotes: "string",
      },
      conversationPrepCard: {
        opening: "string",
        talkTracks: ["string"],
        firstQuestions: ["string"],
        landmines: ["string"],
        desiredNextStep: "string",
      },
      spinQuestionCandidates: [
        {
          phase: "SITUATION | PROBLEM | IMPLICATION | NEED_PAYOFF",
          question: "string",
        },
      ],
      pqQuestions: ["string"],
      issueReadiness: [
        {
          issueKey: "string",
          label: "string",
          level: 0,
          reason: "string",
          nextStep: "string",
        },
      ],
      personalityInference: "string",
      complianceNotes: ["string"],
    }),
    "",
    "目前素材：",
    materials.length ? materials.map((item) => `- ${item}`).join("\n") : "- 尚無明確素材",
    "",
    "對話摘錄：",
    messages.slice(-12).map((message) => `${message.role}: ${message.content}`).join("\n"),
    "",
    "請只回傳 JSON，必須符合以下 keys：clientProfile, conversationPrepCard, spinQuestionCandidates, pqQuestions, issueReadiness, personalityInference, complianceNotes。",
  ].join("\n");
}

export async function POST(req: Request) {
  const startedAt = Date.now();
  const parsedBody = outputRequestSchema.safeParse(await req.json().catch(() => null));

  if (!parsedBody.success) {
    return Response.json({ error: "Invalid output request body" }, { status: 400 });
  }

  const body = parsedBody.data;

  if (!process.env.OPENAI_API_KEY) {
    await writeAiUsageLogSafely({
      organizationId: body.organizationId,
      unitId: body.unitId,
      userId: body.userId,
      clientId: body.clientId,
      provider: AiProvider.OPENAI,
      module: AiModule.INTERVIEW,
      model: MODEL,
      latencyMs: Date.now() - startedAt,
      error: "OPENAI_API_KEY is not configured",
    });

    return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: "你是保險顧問陪談的結構化輸出器。所有輸出必須是 JSON，且遵守合規與事實邊界。",
        },
        {
          role: "user",
          content: buildOutputPrompt(body.materials, body.messages),
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 1800,
    });

    const rawContent = completion.choices[0]?.message.content ?? "{}";
    const parsedOutput = outputDraftSchema.safeParse(JSON.parse(rawContent));

    await writeAiUsageLogSafely({
      organizationId: body.organizationId,
      unitId: body.unitId,
      userId: body.userId,
      clientId: body.clientId,
      provider: AiProvider.OPENAI,
      module: AiModule.INTERVIEW,
      model: MODEL,
      promptTokens: completion.usage?.prompt_tokens,
      completionTokens: completion.usage?.completion_tokens,
      totalTokens: completion.usage?.total_tokens,
      latencyMs: Date.now() - startedAt,
      requestId: completion.id,
    });

    if (!parsedOutput.success) {
      return Response.json({ error: "AI output did not match the expected schema" }, { status: 502 });
    }

    return Response.json(parsedOutput.data);
  } catch (error) {
    await writeAiUsageLogSafely({
      organizationId: body.organizationId,
      unitId: body.unitId,
      userId: body.userId,
      clientId: body.clientId,
      provider: AiProvider.OPENAI,
      module: AiModule.INTERVIEW,
      model: MODEL,
      latencyMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "Interview output generation failed",
    });

    return Response.json(
      { error: error instanceof Error ? error.message : "Interview output generation failed" },
      { status: 500 }
    );
  }
}
