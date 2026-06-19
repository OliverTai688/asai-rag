import OpenAI from "openai";
import { z } from "zod";
import { AiModule } from "@/generated/prisma/enums";
import { canUseAiModule } from "@/lib/auth/policies";
import { authErrorResponse, requireCurrentMember } from "@/lib/auth/current-workspace";
import type { AppSession } from "@/lib/auth/session";
import { getClientForMember } from "@/lib/clients/client-repository";
import {
  normalizeAiError,
  persistAiGenerationFailure,
  persistAiGenerationSuccess,
} from "@/lib/ai/generation-usage-repository";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = "gpt-4o-mini";

const reportRequestSchema = z
  .object({
    prompt: z.string().trim().min(1).max(2000),
    clientId: z.string().trim().min(1).max(120).optional(),
    client: z
      .object({
        id: z.string().trim().min(1).max(120),
      })
      .passthrough()
      .optional(),
  })
  .transform((input) => ({
    prompt: input.prompt,
    clientId: input.clientId ?? input.client?.id,
  }))
  .refine((input) => Boolean(input.clientId), {
    message: "clientId is required.",
    path: ["clientId"],
  });

const SYSTEM_PROMPT = `你是一位具備聯網研究能力的專業保險理財顧問。
請根據提供的「客戶資訊」與「生成要求」，結合當前市場趨勢、法律規範與專業洞察，生成一份深度結構化的報告。

你的報告必須包含以下「多維度洞察區塊」，請使用指定語法包裹：
1. **市場洞察 (:::market)**：結合當前經濟、利率或行業趨勢的外部數據分析。
2. **法規警示 (:::legal)**：相關保險法、稅法或遺產稅等法律條文的即時解析。
3. **溝通策略 (:::strategy)**：針對客戶人格特質，提供給顧問的對談建議（僅供內部參考）。

Markdown 結構要求：
1. **高度結構化**：使用表格進行對比、任務列表 (- [ ]) 列出行動方案。
2. **重點標註**：使用加粗、區塊引言標註核心洞察。
3. **區塊包裹**：確保上述洞察區塊內容精煉且與客戶背景高度相關。

請確保：
1. 語氣專業、客觀。使用繁體中文。
2. 不要輸出任何 Markdown 以外的解釋性文字。`;

export async function POST(req: Request) {
  const startedAt = Date.now();
  let session: AppSession | undefined;
  let scopedClientId: string | undefined;
  let providerAttempted = false;

  try {
    session = await requireCurrentMember();
    const parsedBody = reportRequestSchema.safeParse(await req.json().catch(() => null));

    if (!parsedBody.success) {
      return Response.json(
        {
          error: "INVALID_REPORT_INPUT",
          issues: parsedBody.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const body = parsedBody.data;
    scopedClientId = body.clientId;
    const quota = canUseAiModule(session, AiModule.REPORT);

    if (!quota.allowed) {
      return Response.json(
        {
          error: quota.code,
          remaining: quota.remaining,
          message: "AI 使用額度已用完，請聯絡管理員或升級方案。",
        },
        { status: 429 },
      );
    }

    const clientData = await getClientForMember(session, body.clientId ?? "");

    if (!clientData) {
      return Response.json({ error: "CLIENT_NOT_FOUND" }, { status: 404 });
    }

    if (!process.env.OPENAI_API_KEY) {
      await persistAiGenerationFailure({
        session,
        module: AiModule.REPORT,
        model: MODEL,
        clientId: scopedClientId,
        latencyMs: Date.now() - startedAt,
        error: "OPENAI_API_KEY is not configured",
      });

      return Response.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });
    }

    providerAttempted = true;
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildReportPrompt(body.prompt, clientData) },
      ],
      temperature: 0.7,
    });

    const content = response.choices[0]?.message.content;

    if (!content) {
      await persistAiGenerationFailure({
        session,
        module: AiModule.REPORT,
        model: MODEL,
        clientId: scopedClientId,
        requestId: response.id,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
        latencyMs: Date.now() - startedAt,
        error: "No content received from AI",
      });

      return Response.json({ error: "REPORT_AI_EMPTY_RESPONSE" }, { status: 502 });
    }

    await persistAiGenerationSuccess({
      session,
      module: AiModule.REPORT,
      clientId: scopedClientId,
      usage: {
        model: MODEL,
        requestId: response.id,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
        latencyMs: Date.now() - startedAt,
      },
    });

    return new Response(content, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  } catch (error) {
    if (!session) {
      return authErrorResponse(error);
    }

    if (providerAttempted) {
      await persistAiGenerationFailure({
        session,
        module: AiModule.REPORT,
        model: MODEL,
        clientId: scopedClientId,
        latencyMs: Date.now() - startedAt,
        error: normalizeAiError(error, "Report generation failed"),
      });
    }

    return Response.json({ error: "REPORT_AI_GENERATION_FAILED" }, { status: 500 });
  }
}

function buildReportPrompt(prompt: string, clientData: Awaited<ReturnType<typeof getClientForMember>>) {
  if (!clientData) {
    return prompt;
  }

  return `
客戶資訊：
- 姓名：${clientData.name}
- 職業：${clientData.occupation || "未提供"}
- 年收入：${clientData.annualIncome}
- 家庭成員：${JSON.stringify(clientData.family)}
- 現有保單：${JSON.stringify(clientData.existingPolicies)}
- AI 標籤：${clientData.aiTags.join(", ") || "未提供"}

生成要求：${prompt}
`;
}
